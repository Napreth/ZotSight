import {pdfOutline,translatedOutline,fallbackOutline,type NavigationEntry,type OutlineTranslation} from './outline';
import {OutlineTree,type OutlineState} from './outline-tree';
import { loadPdfJs, Menu, setIcon } from 'obsidian';
import type { Annotation } from './model';
import { matchOffsets, normalizePDFText, pageAtOffset } from './reader-state';
import { annotationIcon } from './annotation-icons';
import {mergeTextRects,selectedTextRects} from './selection-geometry';
import {ReflowView,readingSettings,type ReadingSettings,type ReadingAnchor} from './reflow';
import type {ReflowLoader} from './reflow-processor';
import type {ReadingTranslation} from './reading-api';
import {LocalReadAloud,type SpeechSettings} from './read-aloud';
import {speechDocument} from './speech-document';
import type {StructuredDocumentText} from '../vendor/structured-document-text/schema';
import type {ReadAloudSegment} from '../vendor/zotero-reader/common/types';
import {getTextNodeSpans} from '../vendor/zotero-reader/common/sdt/position-mapper';
import {sourceCharacters,normalizeSourceRect,mergeSourceRects} from './reflow-geometry';
import {createHash} from 'node:crypto';

export type AnnotationType='highlight'|'underline'|'note'|'area'|'text'|'ink';
export interface Selection {text:string;rects:number[][];page:number;attachmentId?:string;type?:AnnotationType;color?:string;points?:number[][]}
interface ReaderOptions {speechRoot?:string;outlineTranslations?:()=>OutlineTranslation[];onDocumentMenu?:(anchor:HTMLElement)=>void;speech?:SpeechSettings;onSpeechSettings?:(settings:SpeechSettings)=>void;toolbar?:HTMLElement;onAnnotationChange?:(id:string)=>void;onDeleteAnnotation?:(id:string)=>void;onUndo?:(redo:boolean)=>void;reflowLoader?:ReflowLoader;reading?:unknown;onReadingChange?:(settings:ReadingSettings)=>void;translations?:()=>ReadingTranslation[]}
interface PageRecord {number:number;el:HTMLElement;width:number;height:number;rendered:boolean;version:number;task?:any;textTask?:any;promise?:Promise<void>}
interface SearchHit {page:number;offset:number}
export function button(parent:HTMLElement,icon:string,label:string,action:()=>void):HTMLButtonElement {
  const el=parent.createEl('button',{cls:'zs-icon-button',attr:{'aria-label':label,title:label}});setIcon(el,icon);el.addEventListener('click',action);return el;
}

export class PDFReader {
  private lib:any;private pdf:any;private loading:any;private documentVersion=0;private layoutVersion=0;
  private records:PageRecord[]=[];private base={width:612,height:792};
  private toolbar:HTMLElement;private scroll:HTMLElement;private nav:HTMLElement;private navContent:HTMLElement;private navTabs:HTMLElement;
  private pageInput:HTMLInputElement;private total:HTMLElement;private zoomLabel:HTMLElement;private palette:HTMLElement;
  private toolbarNodes:Element[]=[];private selectionFrame?:number;private selectionListener:()=>void;
  private findBar:HTMLElement;private findInput:HTMLInputElement;private findStatus:HTMLElement;
  private pageObserver?:IntersectionObserver;private thumbnailObserver?:IntersectionObserver;
  private thumbnails=new Map<number,HTMLCanvasElement>();private thumbnailTasks=new Set<any>();
  private navVisible=false;private navMode:'thumbnails'|'annotations'|'outline'='thumbnails';private outline:any[]=[];private outlineTree?:OutlineTree;private outlineState:OutlineState={expanded:new Set(),query:'',search:false};
  private tool:'select'|AnnotationType='select';private color='#ffd400';
  private toolButtons=new Map<string,HTMLButtonElement>();private colorButton:HTMLButtonElement;private navButton:HTMLButtonElement;
  private textCache=new Map<number,string>();private hits:SearchHit[]=[];private hitIndex=-1;private searchVersion=0;
  private findTimer?:ReturnType<typeof setTimeout>;private scrollTimer?:ReturnType<typeof setTimeout>;
  private queue=new Set<number>();private running=0;private disposed=false;
  private wheelHost:HTMLElement;private wheelListener:(event:WheelEvent)=>void;private wheelTimer?:ReturnType<typeof setTimeout>;private wheelFrame?:number;private wheelTarget?:{zoom:number;x:number;y:number};
  private drag?:{record:PageRecord;x:number;y:number;box:HTMLElement;points?:number[][];path?:SVGPathElement};
  private reflow?:ReflowView;private reading:ReadingSettings;private readingMode=false;private readingButton?:HTMLButtonElement;private appearanceButton?:HTMLButtonElement;private appearance?:HTMLElement;private appearanceOutside?:(event:PointerEvent)=>void;private originalBytes?:Uint8Array;private body:HTMLElement;
  private sourceHash='';private modeMenu=false;private loaded=false;private speech?:LocalReadAloud;private speechPaint=0;
  page=1;zoom=1;
  get ready():boolean{return this.loaded&&!this.disposed;}
  get mode():'pdf'|'reading'{return this.readingMode?'reading':'pdf';}
  get translationId():string|undefined{return this.readingMode?this.reading.translationId:undefined;}
  async sourcePreview():Promise<string>{const pdf=this.pdf,version=this.documentVersion;if(!pdf)return '';const text:string[]=[];for(let i=1;i<=Math.min(2,pdf.numPages);i++){const page=await pdf.getPage(i),content=await page.getTextContent();if(this.disposed||version!==this.documentVersion)return '';text.push(content.items.map((item:any)=>item.str||'').join(' '));}return text.join('\n');}
  async revealStart():Promise<void>{await this.go(1);(this.readingMode?this.reflow?.scroll:this.scroll)?.focus({preventScroll:true});}
  stopSpeech():void{this.speech?.close();}
  setDocumentMenu(enabled:boolean):void{this.modeMenu=enabled;if(!this.readingButton)return;this.readingButton.empty();setIcon(this.readingButton,'book-open');if(enabled)setIcon(this.readingButton.createSpan('zs-reading-chevron'),'chevron-down');const title=enabled?'文档切换':'阅读模式';this.readingButton.setAttribute('aria-label',title);this.readingButton.title=title;this.readingButton.setAttribute('aria-haspopup',enabled?'menu':'false');if(enabled)this.readingButton.removeAttribute('aria-pressed');else this.readingButton.setAttribute('aria-pressed',String(this.readingMode));}

  constructor(private root:HTMLElement,private onState:(page:number,zoom:number)=>void,private onHighlight:(selection:Selection)=>void,private onQuote:(selection:Selection)=>void,private annotations:()=>Annotation[],private options:ReaderOptions={}) {
    this.reading=readingSettings(options.reading);
    root.addClass('zs-reader-native');
    this.toolbar=options.toolbar||root.createDiv('zs-reader-toolbar');const existing=new Set(this.toolbar.children);
    const navigation=this.toolbar.createDiv('zs-toolbar-group');
    this.toolbar.prepend(navigation);
    this.navButton=button(navigation,'panel-left','显示或隐藏导航栏',()=>this.toggleNavigation());
    this.navButton.setAttribute('aria-pressed','false');this.separator();
    const mode=this.toolbar.createDiv('zs-toolbar-group zs-reading-controls');
    if(options.reflowLoader){this.readingButton=button(mode,'book-open','阅读模式',()=>{if(this.modeMenu)this.options.onDocumentMenu?.(this.readingButton!);else void this.toggleReadingMode();});this.readingButton.setAttribute('aria-pressed','false');button(mode,'headphones','本地朗读',()=>void this.openSpeech());}
    this.separator();const pages=this.toolbar.createDiv('zs-toolbar-group zs-page-controls');
    button(pages,'chevron-up','上一页',()=>void this.go(this.page-1));button(pages,'chevron-down','下一页',()=>void this.go(this.page+1));
    this.pageInput=pages.createEl('input',{type:'number',value:'1',attr:{'aria-label':'页码',min:'1'}});this.pageInput.onchange=()=>void this.go(Number(this.pageInput.value));
    this.total=pages.createSpan({cls:'zs-page-total',text:'/ —'});
    this.toolbar.createDiv('zs-toolbar-spacer');
    const tools=this.toolbar.createDiv('zs-toolbar-group zs-annotation-tools');
    for(const [id,label] of [['highlight','高亮'],['underline','下划线'],['note','便笺'],['text','文字批注'],['area','区域批注'],['ink','手绘']] as const){const b=button(tools,'',label,()=>this.setTool(this.tool===id?'select':id));annotationIcon(b,id);this.toolButtons.set(id,b);}
    this.colorButton=button(tools,'','批注颜色',()=>{this.palette.hidden=!this.palette.hidden;});this.colorButton.createSpan('zs-color-swatch');setIcon(this.colorButton.createSpan('zs-color-chevron'),'chevron-down');this.colorButton.style.setProperty('--zs-annotation-color',this.color);this.colorButton.addClass('zs-color-button');
    this.separator();const end=this.toolbar.createDiv('zs-toolbar-group');
    if(options.reflowLoader){this.appearanceButton=button(end,'','阅读外观',()=>{if(this.appearance)this.setAppearanceOpen(this.appearance.hidden);});this.appearanceButton.setText('Aa');this.appearanceButton.setAttribute('aria-expanded','false');this.appearanceButton.hidden=true;}
    this.zoomLabel=end.createSpan({cls:'zs-zoom-label',text:'100%'});button(end,'search','在 PDF 中查找',()=>this.openFind());
    this.findBar=root.createDiv('zs-find-bar');this.findBar.hidden=true;
    this.findInput=this.findBar.createEl('input',{type:'search',attr:{'aria-label':'在 PDF 中查找',placeholder:'在文档中查找…'}});this.findInput.oninput=()=>{clearTimeout(this.findTimer);this.searchVersion++;this.findTimer=setTimeout(()=>void this.search(this.findInput.value),180);};
    this.findInput.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();void this.nextMatch(e.shiftKey?-1:1);}if(e.key==='Escape'){e.preventDefault();this.closeFind();}};
    this.findStatus=this.findBar.createSpan({cls:'zs-find-status',text:'0 / 0'});button(this.findBar,'chevron-up','上一个匹配',()=>void this.nextMatch(-1));button(this.findBar,'chevron-down','下一个匹配',()=>void this.nextMatch(1));button(this.findBar,'x','关闭查找',()=>this.closeFind());
    const body=this.body=root.createDiv('zs-reader-body');this.nav=body.createDiv('zs-navigation');
    this.navTabs=this.nav.createDiv({cls:'zs-nav-tabs',attr:{role:'tablist','aria-label':'阅读导航'}});this.navContent=this.nav.createDiv('zs-nav-content');
    this.scroll=body.createDiv('zs-pdf-scroll');this.scroll.tabIndex=0;this.scroll.setAttribute('aria-label','PDF 连续阅读区');
    this.scroll.addEventListener('scroll',()=>{clearTimeout(this.scrollTimer);this.scrollTimer=setTimeout(()=>this.onScroll(),80);},{passive:true});
    this.scroll.addEventListener('mouseup',()=>this.captureSelection());this.scroll.addEventListener('keyup',()=>this.captureSelection());
    this.scroll.addEventListener('contextmenu',e=>this.selectionMenu(e));
    this.selectionListener=()=>{if(this.selectionFrame!==undefined)return;this.selectionFrame=this.root.win.requestAnimationFrame(()=>{this.selectionFrame=undefined;if(!this.disposed)this.previewSelection();});};this.root.doc.addEventListener('selectionchange',this.selectionListener);
    this.scroll.addEventListener('pointerdown',e=>this.pointerDown(e));this.scroll.addEventListener('pointermove',e=>this.pointerMove(e));this.scroll.addEventListener('pointerup',e=>this.pointerUp(e));this.scroll.addEventListener('pointercancel',()=>this.cancelDrag());
    root.addEventListener('keydown',e=>this.handleShortcut(e),true);
    this.wheelHost=options.toolbar?.closest<HTMLElement>('.zs-reader-pane')||root;this.wheelListener=e=>this.wheel(e);this.wheelHost.addEventListener('wheel',this.wheelListener,{passive:false});
    this.palette=root.createDiv('zs-color-palette');this.palette.hidden=true;
    for(const [color,label] of [['#ffd400','黄色'],['#ff6666','红色'],['#5fb236','绿色'],['#2ea8e5','蓝色'],['#a28ae5','紫色']]){const b=this.palette.createEl('button',{attr:{'aria-label':label,title:label}});b.style.backgroundColor=color;b.onclick=()=>{this.color=color;this.colorButton.style.setProperty('--zs-annotation-color',color);this.palette.hidden=true;};}
    this.setTool('select');this.updateNavigationWidth();this.renderNavTabs();
    this.toolbarNodes=Array.from(this.toolbar.children).filter(el=>!existing.has(el));
  }

  private async openSpeech():Promise<void>{if(!this.ready||!this.originalBytes||!this.options.reflowLoader)return;if(!this.speech)this.speech=new LocalReadAloud(this.root,async signal=>{const structure=await this.options.reflowLoader!(Uint8Array.from(this.originalBytes!),signal,()=>{});return speechDocument(structure,this.readingMode?this.activeTranslation():null);},(structure,segment)=>void this.paintSpeech(structure,segment),this.options.speech,settings=>{this.options.speech=settings;this.options.onSpeechSettings?.(settings);},()=>this.page,this.options.speechRoot);await this.speech.show();}
  private async paintSpeech(structure:StructuredDocumentText|null,segment:ReadAloudSegment|null):Promise<void>{const version=++this.speechPaint;this.root.querySelectorAll('.zs-speech-overlay').forEach(el=>el.remove());this.reflow?.setSpeechBlocks([]);if(!structure||!segment||this.disposed)return;const spans=getTextNodeSpans(structure,segment.position);if(this.readingMode){this.reflow?.setSpeechBlocks([...new Set(spans.map(span=>span.blockRef.join('.')))]);return;}const pages=new Map<number,number[][]>();for(const span of spans){const chars=sourceCharacters(structure,span.blockRef.join('.'),span.ref.at(-1));for(const char of chars.slice(span.start,span.end)){if(!char.page||!char.rect)continue;const list=pages.get(char.page)||[];list.push(char.rect);pages.set(char.page,list);}}const first=pages.keys().next().value;if(first&&first!==this.page)await this.go(first);if(version!==this.speechPaint||this.disposed)return;for(const [page,rects] of pages){const record=this.records[page-1];if(!record)continue;const source=await this.pdf.getPage(page),viewport=source.getViewport({scale:1});if(version!==this.speechPaint||this.disposed)return;const overlay=record.el.createDiv('zs-speech-overlay');for(const rect of mergeSourceRects(rects.map(r=>normalizeSourceRect(r,viewport)))){const el=overlay.createDiv();el.style.left=rect[0]*100+'%';el.style.top=rect[1]*100+'%';el.style.width=rect[2]*100+'%';el.style.height=rect[3]*100+'%';}}}
  private separator():void{this.toolbar.createDiv('zs-toolbar-separator');}
  private availableTranslations():ReadingTranslation[]{return (this.options.translations?.()||[]).filter(t=>t.sourceHash===this.sourceHash);}
  private activeTranslation():ReadingTranslation|null{return this.availableTranslations().find(t=>t.id===this.reading.translationId)||null;}
  refreshTranslations():void{const active=this.activeTranslation();this.reflow?.setTranslation(active);if(this.navMode==='outline')void this.renderNavigation();for(const [id,b] of this.toolButtons){b.hidden=this.readingMode&&(!!active||['text','area','ink'].includes(id));b.disabled=b.hidden;b.title=this.readingMode&&active?'在原文视图中添加精确批注':b.getAttribute('aria-label')||'';}this.colorButton.hidden=this.readingMode&&!!active;if(active&&this.readingMode)this.setTool('select');}
  async showReadingTranslation(id:string|null):Promise<void>{if(id&&!this.availableTranslations().some(t=>t.id===id))throw Error('译文与当前 PDF 不匹配。');this.speech?.destroy();this.speech=undefined;this.closeFind(false);if(id)this.reading.translationId=id;else delete this.reading.translationId;await this.toggleReadingMode(true);this.refreshTranslations();this.options.onReadingChange?.({...this.reading});}
  private pdfAnchor():ReadingAnchor{const record=this.records.find(r=>r.el.offsetTop+r.el.clientHeight>this.scroll.scrollTop+24)||this.records[this.page-1];return {page:record?.number||this.page,x:this.reading.x,y:record?Math.max(0,Math.min(1,(this.scroll.scrollTop-record.el.offsetTop+24)/Math.max(1,record.el.clientHeight))):0};}
  private updateReadingPosition(y:number,x=this.reading.x):void{if(Math.abs(this.reading.y-y)<.002&&Math.abs(this.reading.x-x)<.002)return;this.reading.y=y;this.reading.x=x;this.options.onReadingChange?.({...this.reading});}
  private changeReadingSize(size:number):void{this.reading.size=Math.max(14,Math.min(32,size));this.appearance?.querySelector<HTMLElement>('.zs-reading-size-value')?.setText(String(this.reading.size));this.reflow?.applySettings(this.reading);this.zoomLabel.setText(`${Math.round(this.reading.size/20*100)}%`);this.options.onReadingChange?.({...this.reading});}
  private setAppearanceOpen(open:boolean):void{if(this.appearance)this.appearance.hidden=!open;this.appearanceButton?.setAttribute('aria-expanded',String(open));}
  private createAppearance():void{
    if(this.appearance)return;const panel=this.appearance=this.root.createDiv('zs-reading-appearance');panel.hidden=true;panel.setAttribute('aria-label','阅读外观');this.appearanceOutside=event=>{if(!panel.contains(event.target as Node)&&!this.appearanceButton?.contains(event.target as Node))this.setAppearanceOpen(false);};this.root.doc.addEventListener('pointerdown',this.appearanceOutside);
    const family=panel.createEl('label',{text:'字体'});const select=family.createEl('select',{attr:{'aria-label':'阅读字体'}});select.createEl('option',{value:'serif',text:'衬线'});select.createEl('option',{value:'sans',text:'无衬线'});select.value=this.reading.font;select.onchange=()=>{this.reading.font=select.value==='sans'?'sans':'serif';this.reflow?.applySettings(this.reading);this.options.onReadingChange?.({...this.reading});};
    const size=panel.createDiv('zs-reading-setting');size.createSpan({text:'字号'});button(size,'minus','减小阅读字号',()=>{this.changeReadingSize(this.reading.size-1);value.setText(String(this.reading.size));});const value=size.createSpan({cls:'zs-reading-size-value',text:String(this.reading.size)});button(size,'plus','增大阅读字号',()=>{this.changeReadingSize(this.reading.size+1);value.setText(String(this.reading.size));});
    const line=panel.createEl('label',{text:'行距'});const input=line.createEl('input',{type:'range',attr:{min:'1.3',max:'2.2',step:'.1','aria-label':'阅读行距'}});input.value=String(this.reading.lineHeight);input.oninput=()=>{this.reading.lineHeight=Number(input.value);this.reflow?.applySettings(this.reading);this.options.onReadingChange?.({...this.reading});};
  }
  async toggleReadingMode(force?:boolean):Promise<void>{
    if(!this.pdf||!this.options.reflowLoader||!this.originalBytes||this.disposed)return;
    const enabled=force??!this.readingMode;if(enabled===this.readingMode){this.reading.mode=enabled?'reflow':'pdf';return;}this.speech?.destroy();this.speech=undefined;
    const anchor=this.readingMode?this.reflow?.anchor()||{page:this.page,y:this.reading.y,x:this.reading.x}:this.reading.mode==='reflow'?{page:this.page,y:this.reading.y,x:this.reading.x}:this.pdfAnchor();
    this.closeFind(false);this.root.win.getSelection()?.removeAllRanges();this.setTool('select');this.readingMode=enabled;this.reading.mode=enabled?'reflow':'pdf';this.reading.y=anchor.y;this.reading.x=anchor.x||0;
    if(!this.modeMenu)this.readingButton?.setAttribute('aria-pressed',String(enabled));this.readingButton?.toggleClass('is-active',enabled);if(this.appearanceButton)this.appearanceButton.hidden=!enabled;this.setAppearanceOpen(false);
    for(const id of ['text','area','ink']){const b=this.toolButtons.get(id);if(b){b.disabled=enabled;b.title=enabled?'此工具用于原 PDF 版面':b.getAttribute('aria-label')||'';}}
    this.scroll.hidden=enabled;this.root.toggleClass('zs-reading-mode',enabled);this.options.onReadingChange?.({...this.reading});
    if(enabled){
      this.layoutVersion++;this.queue.clear();for(const record of this.records){record.task?.cancel();record.textTask?.cancel?.();record.promise=undefined;}
      if(!this.reflow){this.reflow=new ReflowView(this.body,this.pdf,this.options.reflowLoader,this.originalBytes,this.reading,this.annotations,position=>{if(this.readingMode&&!this.disposed){this.setPage(position.page);this.updateReadingPosition(position.y,position.x);}},id=>this.openAnnotations(id));
        const scroll=this.reflow.scroll;scroll.addEventListener('mouseup',()=>this.captureSelection());scroll.addEventListener('keyup',()=>this.captureSelection());scroll.addEventListener('contextmenu',event=>this.selectionMenu(event));scroll.addEventListener('pointerdown',event=>{if(this.tool==='note'){event.preventDefault();const note=this.reflow?.noteAt(event.clientX,event.clientY);if(note){this.onHighlight({...note,color:this.color});this.drawAnnotations();this.openAnnotations(this.annotations().at(-1)?.id);}}else if(!(event.target as Element)?.closest('a,button'))scroll.focus({preventScroll:true});});
      }
      this.createAppearance();this.zoomLabel.setText(`${Math.round(this.reading.size/20*100)}%`);
      this.reflow.setTranslation(this.activeTranslation());try{await this.reflow.show(anchor);this.refreshTranslations();}catch{} // The reading surface displays the recoverable error.
    }else{for(const b of this.toolButtons.values()){b.disabled=false;b.hidden=false;b.title=b.getAttribute('aria-label')||'';}this.colorButton.hidden=false;this.reflow?.hide();await this.go(anchor.page);if(this.disposed)return;const record=this.records[anchor.page-1];if(record)this.scroll.scrollTop=Math.max(0,record.el.offsetTop+anchor.y*record.el.clientHeight-24);this.sizePages();this.drawAnnotations();this.scroll.focus();}
  }
  private setTool(tool:'select'|AnnotationType):void{if(this.readingMode&&this.activeTranslation()&&tool!=='select')return;if(this.selections().length)this.root.win.getSelection()?.removeAllRanges();this.tool=tool;for(const [id,b] of this.toolButtons){b.toggleClass('is-active',id===tool);b.setAttribute('aria-pressed',String(id===tool));}this.root.dataset.tool=tool;this.hideSelection();}
  handleShortcut(event:KeyboardEvent):boolean|undefined{
    if(this.disposed||!this.pdf||event.defaultPrevented)return;
    const target=event.target instanceof Element?event.target:null;if(target?.closest('.zs-outline-tree,.zs-outline-search')&&!event.ctrlKey&&!event.metaKey&&event.key!=='F3')return;const field=target?.closest('input,textarea,[contenteditable="true"]');const editable=field&&(this.root.contains(field)||this.toolbar.contains(field));
    const key=event.key.toLowerCase(),mod=(event.ctrlKey||event.metaKey)&&!event.altKey;
    const consume=()=>{event.preventDefault();event.stopPropagation();return false;};
    if(mod&&key==='f'){this.openFind();return consume();}
    if((event.key==='F3'&&!event.ctrlKey&&!event.metaKey)||(mod&&key==='g')){if(this.findBar.hidden)this.openFind();else void this.nextMatch(event.shiftKey?-1:1);return consume();}
    if(!this.findBar.hidden&&this.findBar.contains(target)&&event.key==='Enter'){void this.nextMatch(event.shiftKey?-1:1);return consume();}
    if(mod&&(key==='z'||key==='y')){if(editable)return true;this.options.onUndo?.(key==='y'||event.shiftKey);return consume();}
    if(mod&&['+','=','-','0'].includes(key)){if(this.readingMode)this.changeReadingSize(key==='0'?20:key==='-'?this.reading.size-1:this.reading.size+1);else void this.setZoom(key==='0'?1:key==='-'?this.zoom/1.15:this.zoom*1.15);return consume();}
    if(mod&&['Home','End'].includes(event.key)){if(editable)return true;void this.go(event.key==='Home'?1:this.records.length);return consume();}
    if(key==='escape'){if(this.appearance&&!this.appearance.hidden){this.setAppearanceOpen(false);return consume();}if(!this.findBar.hidden)this.closeFind();else{this.cancelDrag();this.setTool('select');this.palette.hidden=true;}return consume();}
    if(!editable&&!mod&&['PageUp','PageDown'].includes(event.key)){void this.go(this.page+(event.key==='PageDown'?1:-1));return consume();}
  }
  private updateNavigationWidth():void{this.root.closest<HTMLElement>('.zs-reader-pane')?.style.setProperty('--zs-nav-width',this.navVisible?'168px':'0px');}
  private toggleNavigation():void{this.navVisible=!this.navVisible;this.nav.toggleClass('is-open',this.navVisible);this.navButton.setAttribute('aria-pressed',String(this.navVisible));this.updateNavigationWidth();this.resize();}
  private renderNavTabs():void{this.navTabs.empty();for(const [id,icon,label] of [['thumbnails','layout-grid','页面缩略图'],['annotations','messages-square','批注列表'],['outline','list-tree','文档目录']] as const){const b=button(this.navTabs,icon,label,()=>{this.navMode=id;this.renderNavTabs();void this.renderNavigation();});b.setAttribute('role','tab');b.setAttribute('aria-selected',String(id===this.navMode));b.toggleClass('is-active',id===this.navMode);}if(this.navMode==='outline'){this.navTabs.createDiv('zs-toolbar-spacer');const search=button(this.navTabs,'search','搜索大纲',()=>{this.outlineState.search=!this.outlineState.search;this.outlineTree?.setSearch(this.outlineState.search,true);search.setAttribute('aria-pressed',String(this.outlineState.search));});search.setAttribute('aria-pressed',String(this.outlineState.search));}}

  async load(data:Uint8Array,page=1,zoom=1):Promise<void>{
    const version=++this.documentVersion;this.disposed=false;this.loaded=false;this.scroll.setText('正在加载 PDF…');
    this.sourceHash=createHash('md5').update(data).digest('hex');if(this.options.reflowLoader)this.originalBytes=Uint8Array.from(data);this.lib=await loadPdfJs();if(version!==this.documentVersion)return;
    this.loading=this.lib.getDocument({data,isEvalSupported:false});const pdf=await this.loading.promise;
    if(version!==this.documentVersion){await pdf.destroy();return;}
    this.pdf=pdf;const first=await pdf.getPage(1);const viewport=first.getViewport({scale:1});this.base={width:viewport.width,height:viewport.height};
    this.zoom=Math.max(.25,Math.min(5,zoom));this.page=Math.max(1,Math.min(pdf.numPages,page));
    this.pageInput.max=String(pdf.numPages);this.total.setText(`/ ${pdf.numPages}`);this.scroll.empty();
    this.records=Array.from({length:pdf.numPages},(_,index)=>({number:index+1,el:this.scroll.createDiv({cls:'zs-pdf-page',attr:{'data-page':String(index+1),'aria-label':`第 ${index+1} 页`}}),width:this.base.width,height:this.base.height,rendered:false,version:0}));
    this.layoutPages();
    this.pageObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting)this.enqueue(Number((entry.target as HTMLElement).dataset.page));},{root:this.scroll,rootMargin:'900px 0px'});for(const record of this.records)this.pageObserver.observe(record.el);
    void pdf.getOutline().then((outline:any[])=>{if(version===this.documentVersion){this.outline=outline||[];if(this.navMode==='outline')void this.renderNavigation();}}).catch(()=>{});
    await this.renderNavigation();await this.go(this.page);this.onState(this.page,this.zoom);if(this.reading.mode==='reflow')await this.toggleReadingMode(true);this.loaded=true;
  }

  private layoutPages():void{
    if(!this.pdf)return;this.layoutVersion++;this.queue.clear();
    for(const record of this.records){record.task?.cancel();record.textTask?.cancel?.();record.version=this.layoutVersion;record.rendered=false;record.promise=undefined;record.el.empty();}
    this.sizePages();this.hideSelection();
    const version=this.layoutVersion;this.root.win.requestAnimationFrame(()=>{if(this.disposed||version!==this.layoutVersion)return;const top=this.scroll.scrollTop-800,bottom=this.scroll.scrollTop+this.scroll.clientHeight+800;for(const record of this.records)if(record.el.offsetTop+record.el.offsetHeight>=top&&record.el.offsetTop<=bottom)this.enqueue(record.number);});
  }
  private sizePages():void{const width=Math.max(180,this.scroll.clientWidth-44)*this.zoom;for(const record of this.records){record.el.style.width=`${width}px`;record.el.style.height=`${width*record.height/record.width}px`;record.el.style.setProperty('--scale-factor',String(width/record.width));record.el.style.setProperty('--total-scale-factor',String(width/record.width));}this.zoomLabel.setText(`${Math.round(width/this.base.width*100)}%`);}
  private enqueue(number:number):void{const record=this.records[number-1];if(!record||record.rendered||record.promise||this.disposed||this.readingMode)return;this.queue.add(number);this.pump();}
  private pump():void{while(this.running<2&&this.queue.size){const number=this.queue.values().next().value!;this.queue.delete(number);const record=this.records[number-1];if(!record||record.rendered||record.promise)continue;this.running++;void this.renderPage(record).finally(()=>{this.running--;this.pump();});}}
  private async renderPage(record:PageRecord):Promise<void>{
    if(record.rendered)return;if(record.promise)return record.promise;
    const pdf=this.pdf,version=this.layoutVersion,documentVersion=this.documentVersion;
    const current=()=>!this.disposed&&pdf===this.pdf&&version===this.layoutVersion&&documentVersion===this.documentVersion;
    const work=(async()=>{try{
      const page=await pdf.getPage(record.number);if(!current())return;const base=page.getViewport({scale:1});record.width=base.width;record.height=base.height;
      const width=Math.max(180,this.scroll.clientWidth-44)*this.zoom;const viewport=page.getViewport({scale:width/base.width});record.el.style.height=`${viewport.height}px`;record.el.style.setProperty('--scale-factor',String(viewport.scale));record.el.style.setProperty('--total-scale-factor',String(viewport.scale));
      record.el.empty();const canvas=record.el.createEl('canvas');const ratio=Math.min(this.root.win.devicePixelRatio||1,2,Math.sqrt(12000000/(viewport.width*viewport.height)));
      canvas.width=Math.floor(viewport.width*ratio);canvas.height=Math.floor(viewport.height*ratio);canvas.style.width='100%';canvas.style.height='100%';
      record.task=page.render({canvasContext:canvas.getContext('2d'),canvas,viewport,transform:ratio!==1?[ratio,0,0,ratio,0,0]:undefined});await record.task.promise;if(!current())return;
      const text=await page.getTextContent();if(!current())return;this.textCache.set(record.number,text.items.map((item:any)=>item.str||'').join(''));
      const layer=record.el.createDiv('textLayer');
      if(this.lib.TextLayer){record.textTask=new this.lib.TextLayer({textContentSource:text,container:layer,viewport});await record.textTask.render();}
      else if(this.lib.renderTextLayer){record.textTask=this.lib.renderTextLayer({textContentSource:text,textContent:text,container:layer,viewport,textDivs:[]});await record.textTask.promise;}
      if(!current())return;record.rendered=true;this.drawPageAnnotations(record);this.markSearch(record);
    }catch(error:any){if(current()&&!['RenderingCancelledException','AbortException'].includes(error?.name)){record.el.empty();record.el.createDiv({cls:'zs-reader-message',text:`第 ${record.number} 页读取失败：${error?.message||error}`});}}})();
    record.promise=work;try{await work;}finally{if(record.promise===work)record.promise=undefined;}
  }

  async go(page:number):Promise<void>{
    if(!this.pdf)return;page=Math.max(1,Math.min(this.pdf.numPages,Math.floor(page)||1));
    if(this.readingMode){this.reflow?.go({page,y:0});this.setPage(page);return;}const record=this.records[page-1];this.scroll.scrollTop=Math.max(0,record.el.offsetTop-20);this.setPage(page);await this.renderPage(record);this.enqueue(page-1);this.enqueue(page+1);
  }
  private setPage(page:number):void{const changed=this.page!==page;this.page=page;this.pageInput.value=String(page);this.navContent.querySelectorAll<HTMLElement>('[data-page]').forEach(el=>el.toggleClass('is-active',el.dataset.page===String(page)));if(changed)this.onState(page,this.zoom);}
  private onScroll():void{
    if(!this.pdf||this.disposed||this.readingMode)return;this.setPage(pageAtOffset(this.records.map(r=>r.el.offsetTop),this.scroll.scrollTop,this.scroll.clientHeight));this.updateReadingPosition(this.pdfAnchor().y);
    for(const record of this.records){const distance=Math.abs(record.number-this.page);if(distance<=2)this.enqueue(record.number);else if(distance>5&&record.rendered&&!record.promise){record.el.empty();record.rendered=false;}}
  }
  private async setZoom(zoom:number):Promise<void>{if(!this.pdf)return;if(this.readingMode){this.changeReadingSize(this.reading.size+(zoom>this.zoom?1:-1));return;}clearTimeout(this.wheelTimer);this.applyZoom(zoom);await this.renderPage(this.records[this.page-1]);}
  private applyZoom(zoom:number,point?:{x:number;y:number},preview=false):void{
    if(!this.pdf||this.disposed)return;const bounds=this.scroll.getBoundingClientRect();point ||= {x:bounds.left+bounds.width/2,y:bounds.top+bounds.height/2};
    const record=this.records.find(r=>{const b=r.el.getBoundingClientRect();return point!.y>=b.top&&point!.y<=b.bottom;})||this.records[this.page-1];const box=record.el.getBoundingClientRect();
    const x=(point.x-box.left)/Math.max(1,box.width),y=(point.y-box.top)/Math.max(1,box.height);
    this.zoom=Math.max(.25,Math.min(5,zoom));if(preview)this.sizePages();else this.layoutPages();
    this.scroll.scrollTop=Math.max(0,record.el.offsetTop+y*record.el.clientHeight-(point.y-bounds.top));this.scroll.scrollLeft=Math.max(0,record.el.offsetLeft+x*record.el.clientWidth-(point.x-bounds.left));this.onState(this.page,this.zoom);
  }
  private wheel(event:WheelEvent):void{
    if(!(event.ctrlKey||event.metaKey)||!this.pdf||this.disposed)return;event.preventDefault();event.stopPropagation();
    if(this.readingMode){this.changeReadingSize(this.reading.size+(event.deltaY<0?1:-1));return;}const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?this.scroll.clientHeight:1);const base=this.wheelTarget?.zoom??this.zoom;
    this.wheelTarget={zoom:Math.max(.25,Math.min(5,base*Math.exp(-Math.max(-300,Math.min(300,delta))*.002))),x:event.clientX,y:event.clientY};
    if(this.wheelFrame===undefined)this.wheelFrame=this.root.win.requestAnimationFrame(()=>{this.wheelFrame=undefined;const target=this.wheelTarget;this.wheelTarget=undefined;if(target)this.applyZoom(target.zoom,target,true);});
    clearTimeout(this.wheelTimer);this.wheelTimer=setTimeout(()=>{if(!this.disposed){this.layoutPages();this.enqueue(this.page);}},120);
  }
  resize():void{if(!this.pdf||this.disposed||this.readingMode)return;const record=this.records[this.page-1];const fraction=record?(this.scroll.scrollTop-record.el.offsetTop)/Math.max(1,record.el.offsetHeight):0;this.layoutPages();if(record)this.scroll.scrollTop=Math.max(0,record.el.offsetTop+fraction*record.el.offsetHeight);for(let n=this.page-1;n<=this.page+1;n++)this.enqueue(n);}

  private async renderNavigation():Promise<void>{
    this.thumbnailObserver?.disconnect();this.navContent.empty();if(!this.pdf)return;
    if(this.navMode==='thumbnails'){
      this.thumbnailObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){const el=entry.target as HTMLElement;this.thumbnailObserver?.unobserve(el);void this.renderThumbnail(Number(el.dataset.page),el);}}, {root:this.navContent,rootMargin:'250px 0px'});
      for(const record of this.records){const b=this.navContent.createEl('button',{cls:'zs-thumbnail',attr:{'data-page':String(record.number),'aria-label':`跳转到第 ${record.number} 页`}});const paper=b.createDiv('zs-thumbnail-paper');paper.style.aspectRatio=`${record.width} / ${record.height}`;b.createSpan({text:String(record.number)});b.toggleClass('is-active',record.number===this.page);b.onclick=()=>void this.go(record.number);this.thumbnailObserver.observe(b);}
    }else if(this.navMode==='outline'){
      const translations=this.readingMode?this.activeTranslation()?.outline||this.options.outlineTranslations?.():this.options.outlineTranslations?.(),native=pdfOutline(this.outline),items=this.readingMode&&this.reflow?.outline.length?this.reflow.outline:native.length?native:fallbackOutline(translations||[],this.pdf.numPages);
      this.outlineTree=new OutlineTree(this.navContent,translatedOutline(items,translations),this.outlineState,item=>void this.goOutline(item));
    }else this.renderAnnotationList();
  }
  private async goOutline(item:NavigationEntry):Promise<void>{if(this.readingMode&&item.ref&&this.reflow?.goRef(item.ref))return;if(item.page){await this.go(item.page);return;}try{let destination=item.dest;if(typeof destination==='string')destination=await this.pdf.getDestination(destination);if(destination?.[0]!==undefined){const index=typeof destination[0]==='number'?destination[0]:await this.pdf.getPageIndex(destination[0]);await this.go(index+1);}}catch{}}
  private async renderThumbnail(number:number,button:HTMLElement):Promise<void>{
    const holder=button.querySelector<HTMLElement>('.zs-thumbnail-paper');if(!holder||!this.pdf)return;const cached=this.thumbnails.get(number);if(cached){holder.appendChild(cached);return;}
    const pdf=this.pdf,version=this.documentVersion;try{const page=await pdf.getPage(number);if(version!==this.documentVersion)return;const base=page.getViewport({scale:1});const viewport=page.getViewport({scale:126/base.width});const canvas=this.root.doc.createElement('canvas');canvas.width=Math.ceil(viewport.width*1.5);canvas.height=Math.ceil(viewport.height*1.5);const task=page.render({canvasContext:canvas.getContext('2d'),canvas,viewport,transform:[1.5,0,0,1.5,0,0]});this.thumbnailTasks.add(task);try{await task.promise;}finally{this.thumbnailTasks.delete(task);}if(version!==this.documentVersion)return;this.thumbnails.set(number,canvas);if(holder.isConnected)holder.appendChild(canvas);}catch{}
  }
  private renderAnnotationList():void{
    const rows=this.annotations().slice().sort((a,b)=>a.page-b.page||a.createdAt.localeCompare(b.createdAt));if(!rows.length){this.navContent.createDiv({cls:'zs-nav-empty',text:'选择 PDF 文字，或使用顶部批注工具添加批注。'});return;}
    for(const a of rows){const card=this.navContent.createDiv({cls:'zs-nav-annotation',attr:{'data-page':String(a.page),'data-annotation':a.id}});card.style.setProperty('--annotation-color',a.color);const head=card.createDiv('zs-nav-annotation-head');const link=head.createEl('button',{text:`第 ${a.page} 页`});link.onclick=()=>void this.go(a.page);const actions=head.createDiv('zs-nav-annotation-actions');if(a.text)button(actions,'quote','引用到笔记',()=>this.onQuote({text:a.text,rects:a.rects,page:a.page}));if(this.options.onDeleteAnnotation)button(actions,'trash-2','删除此批注',()=>{this.options.onDeleteAnnotation?.(a.id);this.drawAnnotations();});if(a.text)card.createDiv({cls:'zs-nav-annotation-text',text:a.text});const comment=card.createEl('textarea',{attr:{'aria-label':'批注评论',placeholder:'添加评论…'}});comment.value=a.comment;comment.oninput=()=>{a.comment=comment.value;this.options.onAnnotationChange?.(a.id);if(a.type==='text')for(const record of this.records)if(record.rendered)this.drawPageAnnotations(record);};}
  }

  private selections():Selection[]{
    if(this.readingMode&&this.activeTranslation())return [];
    if(this.readingMode)return this.reflow?.selections()||[];const selected=this.root.win.getSelection();if(!selected?.rangeCount||selected.isCollapsed)return [];const range=selected.getRangeAt(0);const selections:Selection[]=[];
    for(const record of this.records){const layer=record.el.querySelector<HTMLElement>('.textLayer');if(!layer||!range.intersectsNode(layer))continue;const piece=range.cloneRange(),contents=this.root.doc.createRange();contents.selectNodeContents(layer);
      if(piece.compareBoundaryPoints(Range.START_TO_START,contents)<0)piece.setStart(layer,0);if(piece.compareBoundaryPoints(Range.END_TO_END,contents)>0)piece.setEnd(layer,layer.childNodes.length);
      const text=(layer.contains(range.startContainer)&&layer.contains(range.endContainer)?selected.toString():piece.toString()).trim();if(!text)continue;const bounds=record.el.getBoundingClientRect();const rects=selectedTextRects(piece,layer,bounds).map(([x,y,w,h])=>[x/bounds.width,y/bounds.height,w/bounds.width,h/bounds.height]);if(rects.length)selections.push({text,rects,page:record.number,color:this.color});
    }
    return selections;
  }
  private previewSelection():void{this.hideSelection();if(this.readingMode)return;if(!['select','highlight','underline'].includes(this.tool))return;for(const s of this.selections()){const record=this.records[s.page-1],overlay=record.el.createDiv('zs-text-selection');for(const [x,y,w,h] of s.rects){const el=overlay.createDiv();el.style.left=`${x*100}%`;el.style.top=`${y*100}%`;el.style.width=`${w*100}%`;el.style.height=`${h*100}%`;}}}
  private captureSelection():void{if(this.drag||!['select','highlight','underline'].includes(this.tool))return;if(this.tool==='highlight'||this.tool==='underline')this.commitSelection(this.tool);else this.previewSelection();}
  private commitSelection(type:AnnotationType):void{const selections=this.selections();if(!selections.length)return;for(const s of selections)this.onHighlight({...s,type,color:this.color});this.root.win.getSelection()?.removeAllRanges();this.hideSelection();this.drawAnnotations();}
  private hideSelection():void{this.root.querySelectorAll('.zs-text-selection').forEach(el=>el.remove());}
  private selectionMenu(event:MouseEvent):void{
    const selections=this.selections();if(!selections.length)return;event.preventDefault();event.stopPropagation();const menu=new Menu();
    menu.addItem(i=>i.setTitle('复制').setIcon('copy').onClick(()=>void navigator.clipboard.writeText(selections.map(s=>s.text).join('\n'))));
    menu.addItem(i=>i.setTitle('高亮').setIcon('highlighter').onClick(()=>{for(const s of selections)this.onHighlight({...s,type:'highlight',color:this.color});this.root.win.getSelection()?.removeAllRanges();this.hideSelection();this.drawAnnotations();}));
    menu.addItem(i=>i.setTitle('下划线').setIcon('underline').onClick(()=>{for(const s of selections)this.onHighlight({...s,type:'underline',color:this.color});this.root.win.getSelection()?.removeAllRanges();this.hideSelection();this.drawAnnotations();}));
    menu.addItem(i=>i.setTitle('引用到笔记').setIcon('quote').onClick(()=>{for(const s of selections)this.onQuote(s);this.hideSelection();}));menu.showAtMouseEvent(event);
  }
  openAnnotations(id?:string):void{const opening=!this.navVisible;this.navVisible=true;this.navMode='annotations';this.nav.addClass('is-open');this.navButton.setAttribute('aria-pressed','true');this.renderNavTabs();void this.renderNavigation();if(opening){this.updateNavigationWidth();this.resize();}if(id){const card=Array.from(this.navContent.querySelectorAll<HTMLElement>('[data-annotation]')).find(el=>el.dataset.annotation===id);card?.scrollIntoView({block:'nearest'});card?.querySelector('textarea')?.focus();}}
  private pointerDown(event:PointerEvent):void{
    if(!(event.target as HTMLElement).closest('input,textarea,[contenteditable="true"]'))this.scroll.focus({preventScroll:true});
    if(!['area','note','text','ink'].includes(this.tool)||event.button!==0||(event.target as HTMLElement).closest('.zs-annotation-note,.zs-annotation-text'))return;const el=(event.target as HTMLElement).closest<HTMLElement>('.zs-pdf-page');if(!el)return;const record=this.records[Number(el.dataset.page)-1];const r=el.getBoundingClientRect(),x=(event.clientX-r.left)/r.width,y=(event.clientY-r.top)/r.height;event.preventDefault();
    if(this.tool==='note'){this.onHighlight({text:'',rects:[[x,y,.025,.025]],page:record.number,type:'note',color:this.color});this.drawAnnotations();this.openAnnotations(this.annotations().at(-1)?.id);return;}
    if(this.tool==='text'){this.onHighlight({text:'',rects:[[x,y,Math.max(.03,Math.min(.3,1-x)),.07]],page:record.number,type:'text',color:this.color});this.drawAnnotations();record.el.querySelector<HTMLElement>('.zs-annotation-text:last-child')?.focus();return;}
    if(this.tool==='ink'){const box=el.createDiv('zs-ink-draft');const ns='http://www.w3.org/2000/svg';const svg=this.root.doc.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 1000 1000');svg.setAttribute('preserveAspectRatio','none');const path=this.root.doc.createElementNS(ns,'path');path.setAttribute('fill','none');path.setAttribute('stroke',this.color);path.setAttribute('stroke-width','2');path.setAttribute('vector-effect','non-scaling-stroke');path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-linejoin','round');svg.appendChild(path);box.appendChild(svg);this.drag={record,x,y,box,points:[[x,y]],path};this.scroll.setPointerCapture(event.pointerId);return;}
    const box=el.createDiv('zs-area-draft');this.drag={record,x,y,box};this.scroll.setPointerCapture(event.pointerId);this.pointerMove(event);
  }
  private pointerMove(event:PointerEvent):void{if(!this.drag)return;const r=this.drag.record.el.getBoundingClientRect(),x=Math.max(0,Math.min(1,(event.clientX-r.left)/r.width)),y=Math.max(0,Math.min(1,(event.clientY-r.top)/r.height));const {box,points,path}=this.drag;if(points&&path){if(points.length<10000)points.push([x,y]);path.setAttribute('d',points.map(([x,y],i)=>`${i?'L':'M'}${x*1000} ${y*1000}`).join(' '));return;}box.style.left=`${Math.min(x,this.drag.x)*100}%`;box.style.top=`${Math.min(y,this.drag.y)*100}%`;box.style.width=`${Math.abs(x-this.drag.x)*100}%`;box.style.height=`${Math.abs(y-this.drag.y)*100}%`;}
  private pointerUp(event:PointerEvent):void{if(!this.drag)return;this.pointerMove(event);const {record,box,points}=this.drag;const rect=points?[0,0,1,1]:[parseFloat(box.style.left)/100,parseFloat(box.style.top)/100,parseFloat(box.style.width)/100,parseFloat(box.style.height)/100];this.cancelDrag();if(this.scroll.hasPointerCapture(event.pointerId))this.scroll.releasePointerCapture(event.pointerId);if(points?points.length>2:rect[2]>.005&&rect[3]>.005){this.onHighlight({text:'',rects:[rect],page:record.number,type:points?'ink':'area',points,color:this.color});this.drawAnnotations();}}
  private cancelDrag():void{this.drag?.box.remove();this.drag=undefined;}
  drawAnnotations():void{this.reflow?.drawAnnotations();for(const record of this.records)if(record.rendered)this.drawPageAnnotations(record);if(this.navMode==='annotations'){this.navContent.empty();this.renderAnnotationList();}}
  private drawPageAnnotations(record:PageRecord):void{
    record.el.querySelector('.zs-highlights')?.remove();const overlay=record.el.createDiv('zs-highlights');
    for(const a of this.annotations().filter(a=>a.page===record.number)){
      const type=a.type||'highlight';const width=record.el.clientWidth,height=record.el.clientHeight;if(!width||!height)continue;
      const rects=['highlight','underline'].includes(type)?mergeTextRects(a.rects.map(([x,y,w,h])=>[x*width,y*height,w*width,h*height])).map(([x,y,w,h])=>[x/width,y/height,w/width,h/height]):a.rects;
      for(const [x,y,w,h] of rects){const el=overlay.createDiv(`zs-highlight zs-annotation-${type}`);el.dataset.annotation=a.id;el.style.left=`${x*100}%`;el.style.top=`${y*100}%`;el.style.width=`${w*100}%`;el.style.height=`${h*100}%`;const color=/^#[0-9a-f]{6}$/i.test(a.color)?a.color:'#ffd400';el.style.setProperty('--annotation-color',color);el.style.backgroundColor=type==='highlight'?color:'transparent';el.title=a.comment||a.text;
        if(type==='note'){setIcon(el,'sticky-note');el.onclick=()=>this.openAnnotations(a.id);}
        if(type==='text'){el.contentEditable='true';el.spellcheck=false;el.setAttribute('aria-label','文字批注');el.setText(a.comment||a.text);el.oninput=()=>{a.comment=el.innerText;this.options.onAnnotationChange?.(a.id);};el.onkeydown=e=>{if(e.key==='Escape'){e.stopPropagation();el.blur();}};}
        if(type==='ink'&&a.points?.length){const ns='http://www.w3.org/2000/svg',svg=this.root.doc.createElementNS(ns,'svg'),path=this.root.doc.createElementNS(ns,'path');svg.setAttribute('viewBox','0 0 1000 1000');svg.setAttribute('preserveAspectRatio','none');path.setAttribute('d',a.points.map(([x,y],i)=>`${i?'L':'M'}${x*1000} ${y*1000}`).join(' '));path.setAttribute('fill','none');path.setAttribute('stroke',color);path.setAttribute('stroke-width','2');path.setAttribute('vector-effect','non-scaling-stroke');path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-linejoin','round');svg.appendChild(path);el.appendChild(svg);}
      }
    }
  }

  openFind():void{this.findBar.hidden=false;this.findInput.focus();this.findInput.select();if(this.findInput.value)void this.search(this.findInput.value);}
  closeFind(focus=true):void{this.findBar.hidden=true;this.searchVersion++;this.hits=[];this.hitIndex=-1;this.findStatus.setText('0 / 0');for(const record of this.records)this.markSearch(record);this.reflow?.search('');if(focus)(this.readingMode?this.reflow?.scroll:this.scroll)?.focus();}
  private async search(query:string):Promise<void>{
    if(this.readingMode){this.reflow?.search(query);this.findStatus.setText(query?this.reflow?.searchStatus||'未找到':'0 / 0');return;}
    const version=++this.searchVersion,pdf=this.pdf;this.hits=[];this.hitIndex=-1;if(!pdf||!normalizePDFText(query)){this.findStatus.setText('0 / 0');for(const r of this.records)this.markSearch(r);return;}
    this.findStatus.setText('查找中…');
    try{for(let page=1;page<=pdf.numPages;page++){if(version!==this.searchVersion||pdf!==this.pdf)return;let text=this.textCache.get(page);if(text===undefined){const proxy=await pdf.getPage(page);const content=await proxy.getTextContent();text=content.items.map((i:any)=>i.str||'').join('');this.textCache.set(page,text!);}if(version!==this.searchVersion||pdf!==this.pdf)return;for(const offset of matchOffsets(text!,query))this.hits.push({page,offset});}
      if(version!==this.searchVersion||pdf!==this.pdf)return;this.hitIndex=this.hits.length?0:-1;this.updateFindStatus();if(this.hits.length)await this.go(this.hits[0].page);for(const r of this.records)this.markSearch(r);
    }catch{if(version===this.searchVersion)this.findStatus.setText('查找失败');}
  }
  private updateFindStatus():void{this.findStatus.setText(this.hits.length?`${this.hitIndex+1} / ${this.hits.length}`:'未找到');}
  private async nextMatch(delta:number):Promise<void>{if(this.readingMode){this.reflow?.nextMatch(delta);this.findStatus.setText(this.reflow?.searchStatus||'未找到');return;}if(!this.hits.length)return;this.hitIndex=(this.hitIndex+delta+this.hits.length)%this.hits.length;this.updateFindStatus();const hit=this.hits[this.hitIndex];await this.go(hit.page);for(const record of this.records)this.markSearch(record);const mark=this.records[hit.page-1].el.querySelector<HTMLElement>('.zs-search-current');if(mark){const rect=mark.getBoundingClientRect(),scroll=this.scroll.getBoundingClientRect();if(rect.top<scroll.top+55||rect.bottom>scroll.bottom)this.scroll.scrollTop+=rect.top-scroll.top-this.scroll.clientHeight*.3;}}
  private markSearch(record:PageRecord):void{
    const spans=Array.from(record.el.querySelectorAll<HTMLElement>('.textLayer span')).filter(el=>!el.querySelector('span'));for(const span of spans)span.removeClass('zs-search-hit','zs-search-current');if(this.findBar.hidden||!this.hits.length)return;
    const matches=this.hits.filter(h=>h.page===record.number),length=normalizePDFText(this.findInput.value).length,current=this.hits[this.hitIndex];let offset=0;
    for(const span of spans){const end=offset+normalizePDFText(span.textContent||'').length;if(matches.some(m=>m.offset<end&&m.offset+length>offset))span.addClass('zs-search-hit');if(current?.page===record.number&&current.offset<end&&current.offset+length>offset)span.addClass('zs-search-current');offset=end;}
  }
  async destroy():Promise<void>{this.disposed=true;if(this.appearanceOutside)this.root.doc.removeEventListener('pointerdown',this.appearanceOutside);this.loaded=false;this.speech?.destroy();this.speech=undefined;this.reflow?.destroy();this.reflow=undefined;this.originalBytes=undefined;this.documentVersion++;this.layoutVersion++;this.searchVersion++;this.pageObserver?.disconnect();this.thumbnailObserver?.disconnect();this.root.doc.removeEventListener('selectionchange',this.selectionListener);this.wheelHost.removeEventListener('wheel',this.wheelListener);clearTimeout(this.wheelTimer);if(this.wheelFrame!==undefined)this.root.win.cancelAnimationFrame(this.wheelFrame);if(this.selectionFrame!==undefined)this.root.win.cancelAnimationFrame(this.selectionFrame);this.toolbarNodes.forEach(el=>el.remove());this.toolbarNodes=[];clearTimeout(this.findTimer);clearTimeout(this.scrollTimer);this.queue.clear();this.cancelDrag();for(const record of this.records){record.task?.cancel();record.textTask?.cancel?.();}for(const task of this.thumbnailTasks)task.cancel();await this.loading?.destroy?.();this.pdf=null;this.records=[];this.thumbnails.clear();this.textCache.clear();this.root.closest<HTMLElement>('.zs-reader-pane')?.style.removeProperty('--zs-nav-width');}
}
