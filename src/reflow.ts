import type {StructuredDocumentText} from '../vendor/structured-document-text/schema';
import {renderSDT} from '../vendor/zotero-reader/renderer';
import type {Annotation} from './model';
import type {Selection} from './reader';
import type {ReflowLoader} from './reflow-processor';
import {sourceCharacters,normalizeSourceRect,mergeSourceRects,rectContains} from './reflow-geometry';
import {normalizePDFText} from './reader-state';
import {applyReadingTranslation,type ReadingTranslation} from './reading-api';

export interface ReadingSettings {mode:'pdf'|'reflow';font:'serif'|'sans';size:number;lineHeight:number;y:number;x:number;translationId?:string}
export function readingSettings(raw:unknown):ReadingSettings{
  const value=raw&&typeof raw==='object'?raw as Partial<ReadingSettings>:{};
  return {mode:value.mode==='reflow'?'reflow':'pdf',font:value.font==='sans'?'sans':'serif',size:Math.min(32,Math.max(14,Number(value.size)||20)),lineHeight:Math.min(2.2,Math.max(1.3,Number(value.lineHeight)||1.7)),y:Math.min(1,Math.max(0,Number(value.y)||0)),x:Math.min(1,Math.max(0,Number(value.x)||0)),...(typeof value.translationId==='string'?{translationId:value.translationId}:{})};
}
interface TextEntry {span:HTMLElement;text:string;translated?:boolean;chars:{page:number;rect:number[]|null}[]}
export interface ReadingAnchor {page:number;y:number;x?:number}

function textRange(span:HTMLElement,start:number,end:number):Range{
  const range=span.ownerDocument.createRange(),walker=span.ownerDocument.createTreeWalker(span,NodeFilter.SHOW_TEXT);
  let offset=0,node:Node|null,last:Node=span,started=false;
  while((node=walker.nextNode())){const length=node.textContent?.length||0;if(!started&&start<=offset+length){range.setStart(node,Math.max(0,start-offset));started=true;}if(end<=offset+length){range.setEnd(node,Math.max(0,end-offset));return range;}offset+=length;last=node;}
  if(!started)range.setStart(last,last.textContent?.length||0);range.setEnd(last,last.textContent?.length||0);return range;
}

export class ReflowView {
  readonly scroll:HTMLElement;
  private article?:HTMLElement;private overlay?:HTMLElement;private entries:TextEntry[]=[];
  private controller=new AbortController();private loadTask?:Promise<void>;private disposed=false;
  private cropObserver?:IntersectionObserver;private cropTasks=new Set<any>();private cropQueue:HTMLElement[]=[];private cropsRunning=0;
  private resizeObserver?:ResizeObserver;private drawTimer?:ReturnType<typeof setTimeout>;
  private matches:Range[]=[];private matchIndex=-1;private searchLayer?:HTMLElement;
  private settings:ReadingSettings;private structure?:StructuredDocumentText;private viewports:any[]=[];private translation:ReadingTranslation|null=null;
  constructor(parent:HTMLElement,private pdf:any,private loader:ReflowLoader,private bytes:Uint8Array,settings:ReadingSettings,private annotations:()=>Annotation[],private onPage:(anchor:ReadingAnchor)=>void,private onAnnotation:(id:string)=>void){
    this.settings=settings;this.scroll=parent.createDiv('zs-reflow-scroll');this.scroll.hidden=true;this.scroll.tabIndex=0;this.scroll.setAttribute('aria-label','PDF 阅读模式');
    this.scroll.addEventListener('scroll',()=>{if(this.entries.length&&!this.scroll.hidden)this.onPage(this.anchor());},{passive:true});
    this.scroll.addEventListener('click',event=>{const link=(event.target as Element)?.closest<HTMLAnchorElement>('a');if(!link||!this.article)return;if(link.getAttribute('href')?.startsWith('#sdt-')){event.preventDefault();const id=link.getAttribute('href')!.slice(1);const target=Array.from(this.article.querySelectorAll<HTMLElement>('[id]')).find(el=>el.id===id);if(target)this.scroll.scrollTop+=target.getBoundingClientRect().top-this.scroll.getBoundingClientRect().top-24;}});
  }
  async show(anchor:ReadingAnchor):Promise<void>{this.scroll.hidden=false;this.loadTask ||= this.load();await this.loadTask;if(!this.disposed&&!this.scroll.hidden){this.go(anchor);this.drawAnnotations();this.drawSearch();this.scroll.focus();}}
  hide():void{this.scroll.hidden=true;}
  private async load():Promise<void>{
    this.scroll.empty();this.entries=[];const status=this.scroll.createDiv({cls:'zs-reflow-status',text:'正在准备阅读模式…'});status.setAttribute('role','status');
    try{
      const structure=await this.loader(this.bytes,this.controller.signal,text=>status.setText(text));if(this.disposed)return;this.structure=structure;
      const viewports=await Promise.all(Array.from({length:this.pdf.numPages},(_,i)=>this.pdf.getPage(i+1).then((p:any)=>p.getViewport({scale:1}))));if(this.disposed)return;
      this.viewports=viewports;this.renderDocument();
    }catch(error){if(this.disposed)return;if(!status.isConnected){this.scroll.empty();this.scroll.append(status);}status.setText(`无法生成阅读模式：${error instanceof Error?error.message:String(error)}`);status.createEl('p',{text:'可用顶部阅读模式按钮返回原 PDF。'});this.loadTask=undefined;throw error;}
  }
  setSpeechBlocks(refs:string[]):void{this.article?.querySelectorAll('.zs-speech-active').forEach(el=>el.removeClass('zs-speech-active'));let first:HTMLElement|undefined;for(const ref of refs){const block=Array.from(this.article?.querySelectorAll<HTMLElement>('[data-ref-path]')||[]).find(el=>el.dataset.refPath===ref);if(block){block.addClass('zs-speech-active');first ||= block;}}if(first&&!this.scroll.hidden){const rect=first.getBoundingClientRect(),view=this.scroll.getBoundingClientRect();if(rect.bottom>view.bottom||rect.top<view.top)this.scroll.scrollTop+=rect.top-view.top-40;}}
  get translated():boolean{return !!this.translation;}
  setTranslation(translation:ReadingTranslation|null):void{if(this.translation===translation)return;this.translation=translation;if(this.structure){const anchor=this.anchor();this.renderDocument();this.go(anchor);}}
  private renderDocument():void{
    this.cropObserver?.disconnect();this.resizeObserver?.disconnect();for(const task of this.cropTasks)task.cancel();this.cropQueue=[];this.scroll.empty();this.entries=[];this.matches=[];this.matchIndex=-1;
    const article=renderSDT(this.structure!,this.scroll.ownerDocument,{renderSourceCrops:true});if(this.translation)applyReadingTranslation(article,this.translation);this.article=article;article.addClass('zs-reflow-article');
      for(const link of article.querySelectorAll<HTMLAnchorElement>('a')){const href=link.getAttribute('href')||'';if(!/^(https?:|mailto:|#sdt-)/i.test(href))link.removeAttribute('href');else if(!href.startsWith('#')){link.target='_blank';link.rel='noopener noreferrer';link.addClass('external-link');}}
      for(const span of article.querySelectorAll<HTMLElement>('[data-text-index],[data-translated-ref]')){
        if(span.closest('[hidden]')||(!span.dataset.translatedRef&&span.closest('[data-translated-ref]')))continue;const ref=span.dataset.translatedRef||span.closest<HTMLElement>('[data-ref-path]')?.dataset.refPath;if(!ref)continue;
        const chars=sourceCharacters(this.structure!,ref,span.dataset.translatedRef?undefined:Number(span.dataset.textIndex)).map(c=>({page:c.page,rect:c.rect&&this.viewports[c.page-1]?normalizeSourceRect(c.rect,this.viewports[c.page-1]):null}));
        this.entries.push({span,text:span.textContent||'',chars,translated:!!span.dataset.translatedRef});
      }
      this.scroll.appendChild(article);this.overlay=article.createDiv('zs-reflow-overlays');this.searchLayer=article.createDiv('zs-reflow-search');this.applySettings(this.settings);
      this.prepareCrops(this.structure!,this.viewports);
      this.resizeObserver=new ResizeObserver(()=>{clearTimeout(this.drawTimer);this.drawTimer=setTimeout(()=>{this.drawAnnotations();this.drawSearch();},60);});this.resizeObserver.observe(article);this.drawAnnotations();
      if(!this.entries.length&&!article.querySelector('.sdt-source-crop'))article.createEl('p',{text:'这份 PDF 没有可重排的文字。扫描件需要先做 OCR。'});
  }
  private prepareCrops(structure:StructuredDocumentText,viewports:any[]):void{
    this.cropObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){this.cropObserver?.unobserve(entry.target);this.cropQueue.push(entry.target as HTMLElement);}this.pumpCrops();},{root:this.scroll,rootMargin:'700px 0px'});
    for(const figure of this.article!.querySelectorAll<HTMLElement>('.sdt-source-crop')){
      const ref=figure.dataset.refPath!.split('.').map(Number);let block:any={content:structure.content};for(const index of ref)block=block.content[index];
      const rects=block.anchor?.pageRects||[];const pages=figure.querySelector<HTMLElement>('.sdt-source-crop-pages')!;
      for(const [index,...rect] of rects){if(!viewports[index])continue;const normalized=normalizeSourceRect(rect,viewports[index]);const box=pages.createDiv('zs-reflow-crop');box.dataset.page=String(index+1);box.dataset.rect=JSON.stringify(normalized);box.style.aspectRatio=String(normalized[2]*viewports[index].width/(normalized[3]*viewports[index].height));box.style.maxWidth=`${normalized[2]*viewports[index].width*1.35}px`;this.cropObserver.observe(box);}
    }
  }
  private pumpCrops():void{while(!this.disposed&&this.cropsRunning<2&&this.cropQueue.length){const box=this.cropQueue.shift()!;this.cropsRunning++;void this.renderCrop(box).finally(()=>{this.cropsRunning--;this.pumpCrops();});}}
  private async renderCrop(box:HTMLElement):Promise<void>{
    try{
      const page=await this.pdf.getPage(Number(box.dataset.page));if(this.disposed)return;const rect=JSON.parse(box.dataset.rect!) as number[];const base=page.getViewport({scale:1});const scale=Math.min(3,Math.max(1,Math.min(1600,box.clientWidth*2)/(rect[2]*base.width)));const viewport=page.getViewport({scale});
      const canvas=box.createEl('canvas');canvas.width=Math.max(1,Math.ceil(rect[2]*viewport.width));canvas.height=Math.max(1,Math.ceil(rect[3]*viewport.height));const task=page.render({canvas,canvasContext:canvas.getContext('2d'),viewport,transform:[1,0,0,1,-rect[0]*viewport.width,-rect[1]*viewport.height]});this.cropTasks.add(task);try{await task.promise;}finally{this.cropTasks.delete(task);}if(!this.disposed)box.addClass('is-ready');
    }catch(e){if(!this.disposed)box.setText('图表读取失败');}
  }
  applySettings(settings:ReadingSettings):void{this.settings=settings;const anchor=this.article?this.anchor():undefined;this.scroll.style.setProperty('--zs-reading-size',`${settings.size}px`);this.scroll.style.setProperty('--zs-reading-line',String(settings.lineHeight));this.scroll.dataset.font=settings.font;if(anchor)this.go(anchor);this.drawAnnotations();this.drawSearch();}
  anchor():ReadingAnchor{
    const top=this.scroll.getBoundingClientRect().top+24;const entry=this.entries.find(e=>e.span.getBoundingClientRect().bottom>top);
    if(!entry)return {page:1,y:0};if(entry.translated){const char=entry.chars.find(c=>c.rect&&c.page);return char?{page:char.page,x:char.rect![0],y:char.rect![1]}:{page:1,y:0};}let low=0,high=entry.text.length-1;
    while(low<high){const middle=Math.floor((low+high)/2);if(textRange(entry.span,middle,middle+1).getBoundingClientRect().bottom<top)low=middle+1;else high=middle;}
    const char=entry.chars.slice(low).find(c=>c.page&&c.rect)||entry.chars.find(c=>c.page&&c.rect);return char?{page:char.page,y:char.rect![1],x:char.rect![0]}:{page:1,y:0};
  }
  go(anchor:ReadingAnchor):void{
    let best:TextEntry|undefined,bestIndex=0,distance=Infinity;
    for(const entry of this.entries){for(const [index,char] of entry.chars.entries()){if(!char.rect||char.page!==anchor.page)continue;const d=Math.abs(char.rect[1]-anchor.y)+Math.abs(char.rect[0]-(anchor.x||0))*.15;if(d<distance){distance=d;best=entry;bestIndex=index;}}}
    if(best)this.scroll.scrollTop+=textRange(best.span,best.translated?0:bestIndex,best.translated?Math.min(1,best.text.length):Math.min(best.text.length,bestIndex+1)).getBoundingClientRect().top-this.scroll.getBoundingClientRect().top-24;
    else if(this.entries.length){const nearest=this.entries.find(e=>e.chars.some(c=>c.page>=anchor.page))||this.entries[this.entries.length-1];this.scroll.scrollTop+=nearest.span.getBoundingClientRect().top-this.scroll.getBoundingClientRect().top-24;}
  }
  selections():Selection[]{
    const selection=this.scroll.ownerDocument.getSelection();if(!selection?.rangeCount||selection.isCollapsed)return [];const range=selection.getRangeAt(0);if(!this.article?.contains(range.startContainer)||!this.article.contains(range.endContainer))return [];
    const pages=new Map<number,{text:string;rects:number[][]}>();
    for(const entry of this.entries){if(!range.intersectsNode(entry.span))continue;const piece=range.cloneRange(),all=this.scroll.ownerDocument.createRange();all.selectNodeContents(entry.span);if(piece.compareBoundaryPoints(Range.START_TO_START,all)<0)piece.setStart(entry.span,0);if(piece.compareBoundaryPoints(Range.END_TO_END,all)>0)piece.setEnd(entry.span,entry.span.childNodes.length);const prefix=all.cloneRange();prefix.setEnd(piece.startContainer,piece.startOffset);const start=prefix.toString().length,end=start+piece.toString().length;let lastPage=entry.chars.slice(start,end).find(c=>c.page)?.page||0;
      for(let i=start;i<end;i++){const char=entry.chars[i];if(char?.page)lastPage=char.page;if(!lastPage)continue;let value=pages.get(lastPage);if(!value){value={text:'',rects:[]};pages.set(lastPage,value);}value.text+=entry.text[i]||'';if(char?.rect)value.rects.push(char.rect);}if(lastPage&&pages.has(lastPage))pages.get(lastPage)!.text+=' ';
    }
    return Array.from(pages,([page,value])=>({page,text:value.text.trim(),rects:mergeSourceRects(value.rects)})).filter(s=>s.text&&s.rects.length);
  }
  noteAt(x:number,y:number):Selection|undefined{
    const doc=this.scroll.ownerDocument as Document&{caretRangeFromPoint?:(x:number,y:number)=>Range|null};const caret=doc.caretRangeFromPoint?.(x,y);if(!caret||!this.article?.contains(caret.startContainer))return;
    const entry=this.entries.find(e=>e.span.contains(caret.startContainer));if(!entry)return;const prefix=doc.createRange();prefix.selectNodeContents(entry.span);prefix.setEnd(caret.startContainer,caret.startOffset);const index=Math.min(entry.chars.length-1,prefix.toString().length);const char=entry.chars[index]||entry.chars[index-1];if(char?.rect)return {page:char.page,text:'',rects:[[char.rect[0],char.rect[1],.025,.025]],type:'note'};
  }
  drawAnnotations():void{
    if(!this.overlay||!this.article||this.disposed)return;this.overlay.empty();if(this.translation)return;const bounds=this.article.getBoundingClientRect();
    for(const annotation of this.annotations()){
      const type=annotation.type||'highlight';if(!['highlight','underline','note'].includes(type))continue;let noteDrawn=false;
      for(const entry of this.entries){let start=-1;const flush=(end:number)=>{if(start<0)return;const range=textRange(entry.span,start,end);for(const rect of Array.from(range.getClientRects())){if(!rect.width||!rect.height)continue;const mark=this.overlay!.createDiv(`zs-reflow-mark zs-reflow-${type}`);mark.dataset.annotation=annotation.id;mark.style.cssText=`left:${rect.left-bounds.left}px;top:${rect.top-bounds.top}px;width:${rect.width}px;height:${rect.height}px;--annotation-color:${/^#[a-f0-9]{6}$/i.test(annotation.color)?annotation.color:'#ffd400'}`;if(type==='note'){if(noteDrawn){mark.remove();continue;}noteDrawn=true;mark.setText('▤');mark.setAttribute('role','button');mark.setAttribute('aria-label','查看便笺');mark.title=annotation.comment||'便笺';mark.onclick=()=>this.onAnnotation(annotation.id);}}start=-1;};
        for(let i=0;i<=entry.chars.length;i++){const char=entry.chars[i];const match=char?.rect&&char.page===annotation.page&&annotation.rects.some(r=>rectContains([char.rect![0]+char.rect![2]/2,char.rect![1]+char.rect![3]/2],r));if(match&&start<0)start=i;else if(!match)flush(i);}flush(entry.chars.length);
      }
    }
  }
  search(query:string):void{
    this.matches=[];this.matchIndex=-1;const needle=normalizePDFText(query);
    if(needle){let text='';const positions:{entry:TextEntry;start:number;end:number}[]=[];
      for(const entry of this.entries){let offset=0;for(const char of entry.text){const normalized=normalizePDFText(char);text+=normalized;for(let n=0;n<normalized.length;n++)positions.push({entry,start:offset,end:offset+char.length});offset+=char.length;}}
      let start=0,index;while((index=text.indexOf(needle,start))!==-1){const a=positions[index],b=positions[index+needle.length-1];const range=textRange(a.entry.span,a.start,a.end);const end=textRange(b.entry.span,b.start,b.end);range.setEnd(end.endContainer,end.endOffset);this.matches.push(range);start=index+needle.length;}
    }this.nextMatch(1);
  }
  nextMatch(delta:number):void{if(this.matches.length){this.matchIndex=(this.matchIndex+delta+this.matches.length)%this.matches.length;const rect=this.matches[this.matchIndex].getBoundingClientRect();this.scroll.scrollTop+=rect.top-this.scroll.getBoundingClientRect().top-this.scroll.clientHeight*.3;}this.drawSearch();}
  get searchStatus():string{return this.matches.length?`${this.matchIndex+1} / ${this.matches.length}`:'未找到';}
  private drawSearch():void{if(!this.searchLayer||!this.article)return;this.searchLayer.empty();const bounds=this.article.getBoundingClientRect();for(const [index,range] of this.matches.entries())for(const rect of Array.from(range.getClientRects())){const mark=this.searchLayer.createDiv(`zs-reflow-search-mark${index===this.matchIndex?' is-current':''}`);mark.style.cssText=`left:${rect.left-bounds.left}px;top:${rect.top-bounds.top}px;width:${rect.width}px;height:${rect.height}px`;}}
  destroy():void{this.disposed=true;this.controller.abort();this.cropObserver?.disconnect();this.resizeObserver?.disconnect();clearTimeout(this.drawTimer);for(const task of this.cropTasks)task.cancel();this.cropQueue=[];this.entries=[];this.bytes=new Uint8Array();this.scroll.remove();}
}
