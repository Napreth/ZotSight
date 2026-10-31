import { MarkdownView, Menu, Notice, Scope, TFile, WorkspaceLeaf, setIcon } from 'obsidian';
import type ZotSightPlugin from './main';
import { Attachment, parseSeed, Seed, serializeSeed, zoteroURI } from './model';
import { attachmentsOf } from './zotero';
import { button, PDFReader, Selection } from './reader';
import { BindModal, message, PDFModal, run } from './ui';
import { renderLiteratureInfo } from './info';
import { SourceMenu } from './source-menu';
import {AnnotationHistory} from './annotation-history';
import type {ReaderState} from './api';
import {seedViewUpdate} from './view-update';
export const VIEW_TYPE='zotsight-literature';

export class ZotSightView extends MarkdownView {
  isPlaintext=false;
  seed:Seed|null=null;
  private invalid=false;private raw='';private loadVersion=0;private disposed=false;
  private reader?:PDFReader;private readerRoot?:HTMLElement;private surface?:HTMLElement;
  private readerToolbar?:HTMLElement;
  private select?:SourceMenu;private notesHost?:HTMLElement;private extensionHost?:HTMLElement;
  private rail?:HTMLElement;private rightContent?:HTMLElement;
  private activePanel='notes';private panelCleanup?:()=>void;
  private infoLoading=false;
  private pendingPage?:number;
  private resizeObserver?:ResizeObserver;private resizeTimer?:ReturnType<typeof setTimeout>;private changing=false;
  private layoutEl:HTMLElement;
  private projecting=false;
  private savedSeed?:Seed;private diskLoad=0;
  private pdfFocused=false;private annotationHistory=new AnnotationHistory();
  private shortcutScope:Scope;private leftHost?:HTMLElement;
  constructor(leaf:WorkspaceLeaf,public plugin:ZotSightPlugin){
    super(leaf);this.layoutEl=this.containerEl.createDiv('zs-view');
    const requestSave=this.requestSave;
    this.requestSave=Object.assign(()=>{if(!this.projecting)this.captureNote();requestSave();},requestSave);
    this.shortcutScope=new Scope();this.shortcutScope.register(null,null,(event,context)=>{
      const area=this.focusedArea(event);const handled=this.routeShortcut(event,area);if(handled!==undefined)return handled;
      const base=(area==='pdf'?(this as unknown as {initialScope:Scope}).initialScope:area==='notes'?this.scope:null)||this.app.scope;
      return (base as Scope&{handleKey:(event:KeyboardEvent,context:unknown)=>boolean|undefined}).handleKey(event,context);
    });
    this.registerDomEvent(this.containerEl,'focusin',()=>this.activateShortcuts());this.registerDomEvent(this.containerEl,'pointerdown',()=>this.activateShortcuts(),true);
    this.registerDomEvent(this.containerEl,'focusout',()=>queueMicrotask(()=>{const focused=this.containerEl.doc.activeElement;if(focused!==this.containerEl.doc.body&&!this.containerEl.contains(focused))this.app.keymap.popScope(this.shortcutScope);}));
    this.registerEvent(this.app.workspace.on('active-leaf-change',leaf=>{if(leaf!==this.leaf){this.app.keymap.popScope(this.shortcutScope);this.reader?.stopSpeech();}else this.activateShortcuts();}));
    this.register(()=>this.app.keymap.popScope(this.shortcutScope));
    this.registerDomEvent(this.contentEl,'keydown',event=>{const key=event.key.toLowerCase();if(!(event.ctrlKey||event.metaKey)||event.altKey||!['z','y'].includes(key)||!(event.target instanceof Element)||!event.target.closest('.cm-content'))return;event.preventDefault();event.stopPropagation();if(key==='y'||event.shiftKey)this.editor.redo();else this.editor.undo();this.onInternalDataChange();this.requestSave();},true);
  }
  get noteEditor():this{return this;}
  getViewType():string{return VIEW_TYPE;}
  getDisplayText():string{return this.file?.basename||'ZotSight 文献';}
  getIcon():string{return 'book-open';}
  canAcceptExtension(extension:string):boolean{return extension==='zslp'||extension==='zsseed';}
  async loadFileInternal(file:TFile,clear:boolean):Promise<void>{
    const version=++this.diskLoad;
    try{const seed=(await this.plugin.store.read(file)).seed();if(version!==this.diskLoad||this.file!==file)return;
      this.captureNote();const next=structuredClone(seed);
      if(!clear&&this.seed&&this.savedSeed)for(const key of Object.keys(this.seed))if(JSON.stringify(this.seed[key])!==JSON.stringify(this.savedSeed[key]))next[key]=this.seed[key];
      this.savedSeed=structuredClone(seed);this.setViewData(serializeSeed(next),clear);
    }catch(error){if(version===this.diskLoad&&this.file===file)this.setViewData('',clear,message(error));}
  }
  onExternalDataChange(file:TFile,data:string):void{if(file===this.file&&this.seed)this.setViewData(serializeSeed({...this.seed,note:data}),false);}
  private activateShortcuts():void{queueMicrotask(()=>{const focused=this.containerEl.doc.activeElement;if(focused instanceof Element&&focused.closest('.zs-select-menu:not([hidden]),.zs-source-menu:not([hidden])'))return;if(!this.disposed&&this.app.workspace.activeLeaf===this.leaf&&(focused===this.containerEl.doc.body||this.containerEl.contains(focused)))this.app.keymap.pushScope(this.shortcutScope);});}
  private focusedArea(event:KeyboardEvent):'pdf'|'notes'|null{
    if(this.app.workspace.activeLeaf!==this.leaf)return null;
    for(const target of [event.target,this.containerEl.doc.activeElement]){if(!(target instanceof Node))continue;if(this.leftHost?.contains(target))return 'pdf';if(this.notesHost?.contains(target))return 'notes';}
    return this.containerEl.doc.activeElement===this.containerEl.doc.body?(this.pdfFocused?'pdf':'notes'):null;
  }
  private routeShortcut(event:KeyboardEvent,area:'pdf'|'notes'|null):boolean|undefined{
    if(!area||event.defaultPrevented)return;const key=event.key.toLowerCase(),mod=(event.ctrlKey||event.metaKey)&&!event.altKey;
    if(event.key==='F2'){const title=this.contentEl.querySelector<HTMLElement>('.inline-title');if(title){title.focus();const range=this.containerEl.doc.createRange();range.selectNodeContents(title);const selection=this.containerEl.win.getSelection();selection?.removeAllRanges();selection?.addRange(range);event.preventDefault();event.stopPropagation();return false;}}
    if(area==='pdf'){
      if(mod&&key==='f'){const native=this.currentMode as unknown as {search?:{hide?:()=>void;close?:()=>void}};if(native.search?.hide)native.search.hide();else native.search?.close?.();}
      if(mod&&key==='h')return true;
      return this.reader?.handleShortcut(event);
    }
    if(mod&&(key==='f'||key==='h')){this.reader?.closeFind(false);(this as unknown as {showSearch:(replace?:boolean)=>void}).showSearch(key==='h');event.preventDefault();event.stopPropagation();return false;}
  }
  setEphemeralState(state:unknown):void{
    super.setEphemeralState(state);
    const subpath=state&&typeof state==='object'&&'subpath' in state?String(state.subpath):'';
    if(!subpath.startsWith('#')||!this.seed)return;const params=new URLSearchParams(subpath.slice(1));const value=params.get('page');if(!value||!/^\d+$/.test(value))return;
    const page=Math.max(1,Number(value));const attachment=params.get('attachment');const switchAttachment=!!attachment&&attachment!==this.seed.reader.attachmentId&&this.seed.attachments.some(a=>a.id===attachment);
    if(switchAttachment)this.seed.reader.attachmentId=attachment!;
    this.pendingPage=page;this.seed.reader.page=page;this.changed();
    if(switchAttachment)void this.openAttachment();else if(this.reader?.ready){this.pendingPage=undefined;void this.reader.go(page);}else if(this.seed.attachments.length)void this.openAttachment();
  }
  async onOpen():Promise<void>{await super.onOpen();this.addAction('refresh-cw','刷新文献信息',()=>run(()=>this.refresh()));this.addAction('ellipsis','文献操作',()=>this.menu(this.containerEl.querySelector('.view-header') as HTMLElement||this.layoutEl));}
  private captureNote():void{if(!this.seed||this.invalid||this.projecting)return;const note=super.getViewData();if(this.seed.note!==note){this.seed.note=note;this.seed.updatedAt=new Date().toISOString();this.plugin.emit('literature-change',this.file?{path:this.file.path,seed:structuredClone(this.seed)}:null);}}
  onInternalDataChange():void{
    if(!this.seed||this.projecting)return;const note=this.currentMode.get();if(this.data===note)return;
    this.data=note;this.captureNote();
    // Quick-preview is Markdown, including for native consumers such as word count.
    const workspace=this.app.workspace as typeof this.app.workspace&{onQuickPreview?:(file:TFile|null,data:string)=>void};
    workspace.onQuickPreview?.(this.file,note);
    const native=this as unknown as {loadFrontmatter?:(markdown:string)=>void};native.loadFrontmatter?.(note);
  }
  getViewData():string{this.captureNote();return !this.invalid&&this.seed?serializeSeed(this.seed):this.raw;}
  async save(clear?:boolean):Promise<void>{
    this.captureNote();if(!this.file||this.invalid||!this.seed)return;
    const file=this.file,next=structuredClone(this.seed),previous=this.savedSeed;
    if(!previous||serializeSeed(next)!==serializeSeed(previous)){await this.plugin.store.save(file,next,previous);if(this.file===file)this.savedSeed=next;}
    if(this.file===file&&this.seed&&serializeSeed(this.seed)===serializeSeed(next))(this as unknown as {dirty:boolean}).dirty=false;
    if(clear){this.savedSeed=undefined;this.clear();}
    else if(this.seed){this.data=super.getViewData();this.raw=serializeSeed(this.seed);}
  }
  setViewData(data:string,clear:boolean,loadError?:string):void{
    this.raw=data;this.disposed=false;
    try{
      if(loadError)throw Error(loadError);
      const next=parseSeed(data);const update=seedViewUpdate(this.invalid?null:this.seed,next,clear);
      this.annotationHistory.sync(next.annotations);this.seed=next;this.invalid=false;this.data=next.note;
      this.projecting=true;
      try{
        if(update.rebuild){this.render();super.setViewData(next.note,clear);}
        else{
          if(update.note)super.setViewData(next.note,false);
          const information=this.select?.value==='__info';
          if(update.attachments||update.document){this.renderSourceOptions();if(information&&this.select)this.select.value='__info';}
          if(update.split)this.layoutEl.querySelector<HTMLElement>('.zs-workspace')?.style.setProperty('--zs-split',`${next.reader.split}%`);
          if(information){if(update.metadata||update.attachments)this.renderInfo();}
          else if(update.document)void this.openAttachment();
          else if(update.annotations)this.reader?.drawAnnotations();
        }
      }finally{this.projecting=false;}
    }catch(e){this.invalid=true;this.seed=null;void this.reader?.destroy();this.contentEl.remove();this.layoutEl.empty();const box=this.layoutEl.createDiv('zs-file-error');setIcon(box.createDiv('zs-empty-icon'),'file-warning');box.createEl('h2',{text:'无法打开这份文献'});box.createEl('p',{text:message(e)});box.createEl('p',{cls:'zs-muted',text:'请检查文献包是否完整。ZotSight 不会改写损坏的文件。'});}
  }
  clear():void{this.loadVersion++;this.pendingPage=undefined;this.seed=null;this.raw='';this.invalid=false;this.annotationHistory=new AnnotationHistory();this.pdfFocused=false;this.contentEl.remove();this.layoutEl.empty();super.clear();void this.dispose();}
  async onClose():Promise<void>{this.app.keymap.popScope(this.shortcutScope);await this.save();await this.dispose();await super.onClose();}
  async dispose():Promise<void>{this.disposed=true;this.loadVersion++;clearTimeout(this.resizeTimer);this.resizeObserver?.disconnect();this.select?.destroy();this.panelCleanup?.();this.panelCleanup=undefined;const reader=this.reader;this.reader=undefined;await reader?.destroy();}
  private changed():void{if(!this.seed||this.invalid)return;this.seed.updatedAt=new Date().toISOString();this.requestSave();this.plugin.emit('literature-change',this.file?{path:this.file.path,seed:structuredClone(this.seed)}:null);}
  private annotationChanged(id?:string):void{if(!this.seed)return;this.annotationHistory.record(this.seed.annotations,id);this.changed();}
  private undoAnnotation(redo=false):void{if(!this.seed)return;const value=redo?this.annotationHistory.redo():this.annotationHistory.undo();if(!value)return;this.seed.annotations=value;this.changed();this.reader?.drawAnnotations();}
  private render():void{
    if(!this.seed)return;this.loadVersion++;void this.reader?.destroy();this.reader=undefined;this.select?.destroy();this.resizeObserver?.disconnect();this.panelCleanup?.();this.panelCleanup=undefined;this.contentEl.remove();this.layoutEl.empty();
    const shell=this.layoutEl.createDiv('zs-shell');
    const workspace=shell.createDiv('zs-workspace');workspace.style.setProperty('--zs-split',`${this.seed.reader.split}%`);
    const left=workspace.createDiv('zs-reader-pane zs-reader-native');this.readerToolbar=left.createDiv('zs-reader-toolbar zs-main-toolbar');const sourceBar=this.readerToolbar.createDiv('zs-source-bar');
    this.leftHost=left;
    left.addEventListener('pointerdown',()=>{this.pdfFocused=true;},true);left.addEventListener('focusin',()=>{this.pdfFocused=true;});
    this.select=new SourceMenu(sourceBar,id=>{if(!this.seed)return;if(id==='__info'){void this.reader?.destroy();this.reader=undefined;this.renderInfo();this.emitReaderChange();return;}if(id==='__add'){this.addPDF();return;}this.seed.reader.attachmentId=id;this.seed.reader.page=1;this.changed();void this.openAttachment();},this.app);
    this.renderSourceOptions();
    this.surface=left.createDiv('zs-document-surface');
    const divider=workspace.createDiv({cls:'zs-divider',attr:{role:'separator','aria-orientation':'vertical','aria-label':'调整阅读与笔记宽度',tabindex:'0'}});
    const setSplit=(n:number)=>{if(!this.seed)return;this.seed.reader.split=Math.min(75,Math.max(30,n));workspace.style.setProperty('--zs-split',`${this.seed.reader.split}%`);};
    divider.addEventListener('pointerdown',e=>{divider.setPointerCapture(e.pointerId);this.changing=true;});
    divider.addEventListener('pointermove',e=>{if(!this.changing)return;const r=workspace.getBoundingClientRect();setSplit((e.clientX-r.left)/r.width*100);});
    divider.addEventListener('pointerup',e=>{if(!this.changing)return;this.changing=false;divider.releasePointerCapture(e.pointerId);this.changed();this.reader?.resize();});
    divider.addEventListener('lostpointercapture',()=>{this.changing=false;});
    divider.addEventListener('keydown',e=>{if(!this.seed||!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();setSplit(this.seed.reader.split+(e.key==='ArrowLeft'?-2:2));this.changed();this.reader?.resize();});
    const right=workspace.createDiv('zs-notes-pane');right.addEventListener('pointerdown',()=>{this.pdfFocused=false;},true);right.addEventListener('focusin',()=>{this.pdfFocused=false;});this.rightContent=right.createDiv('zs-right-content');this.notesHost=this.rightContent.createDiv('zs-notes-host');this.extensionHost=this.rightContent.createDiv('zs-extension-host');this.rail=right.createDiv('zs-extension-rail');this.renderRail();this.renderPanel();
    let lastWidth=left.clientWidth;
    this.resizeObserver=new ResizeObserver(()=>{const width=left.clientWidth;if(Math.abs(width-lastWidth)<2||this.changing)return;lastWidth=width;clearTimeout(this.resizeTimer);this.resizeTimer=setTimeout(()=>this.reader?.resize(),180);});this.resizeObserver.observe(left);
    if(this.seed.attachments.length)void this.openAttachment();else this.renderInfo();
  }
  private renderSourceOptions():void{
    if(!this.select||!this.seed)return;const translated=new Set(this.plugin.documentTranslation?.jobs.filter(j=>j.path===this.file?.path).flatMap(j=>j.outputs.filter(o=>o.kind==='pdf').map(o=>o.path))||[]);const originals=this.seed.attachments.filter(a=>!a.sourceAttachmentId&&!translated.has(a.path||''));const selected=this.plugin.documentTranslation?.sourceId(this.file?.path||'',this.seed.reader.attachmentId)||this.seed.reader.attachmentId;
    this.select.update([{id:'__info',title:'信息',icon:'file-text'},...originals.map(a=>({id:a.id,title:a.title,icon:'file-type-2'})),{id:'__add',title:'关联 PDF…',icon:'plus'}],originals.some(a=>a.id===selected)?selected:'__info');
  }
  private async openAttachment():Promise<void>{
    if(!this.seed||!this.surface)return;const a=this.seed.attachments.find(a=>a.id===this.seed!.reader.attachmentId)||this.seed.attachments[0];if(!a){void this.reader?.destroy();this.reader=undefined;this.renderInfo();return;}
    this.seed.reader.attachmentId=a.id;if(this.select)this.select.value=this.plugin.documentTranslation?.sourceId(this.file?.path||'',a.id)||a.id;
    const version=++this.loadVersion;await this.reader?.destroy();if(version!==this.loadVersion)return;
    this.surface.empty();this.surface.createDiv({cls:'zs-reader-message',text:'正在读取附件…'});
    try{
      const data=await this.plugin.readPDF(a,this.seed.source,this.file?.path);if(version!==this.loadVersion||!this.seed)return;
      this.surface.empty();this.readerRoot=this.surface.createDiv('zs-reader');
      this.reader=new PDFReader(this.readerRoot,(page,zoom)=>{if(!this.seed||version!==this.loadVersion)return;if(this.seed.reader.page!==page||this.seed.reader.zoom!==zoom){this.seed.reader.page=page;this.seed.reader.zoom=zoom;this.changed();}},selection=>this.highlight(selection),selection=>this.quote(selection),()=>this.seed?.annotations.filter(n=>n.attachmentId===a.id)||[],{toolbar:this.readerToolbar,onDocumentMenu:anchor=>{if(this.file)void this.plugin.documentTranslation?.showVersionMenu(this.file.path,anchor);},speech:this.plugin.settings.speech,onSpeechSettings:settings=>{this.plugin.settings.speech=settings;void this.plugin.saveSettings();},translations:()=>Array.from(this.plugin.readingTranslations.values()).filter(t=>t.path===this.file?.path&&t.attachmentId===a.id),reflowLoader:this.plugin.readingLoader(this.readerRoot.win,this.file?.path,a.id),reading:this.seed.reader.reading,onReadingChange:settings=>{if(this.seed&&version===this.loadVersion){const previous=this.seed.reader.reading as {mode?:string;translationId?:string}|undefined;const modeChanged=previous?.mode!==settings.mode||previous?.translationId!==settings.translationId;this.seed.reader.reading=settings;this.changed();if(modeChanged)this.emitReaderChange();}},onUndo:redo=>this.undoAnnotation(redo),onAnnotationChange:id=>this.annotationChanged(id),onDeleteAnnotation:id=>{if(!this.seed)return;this.seed.annotations=this.seed.annotations.filter(n=>n.id!==id);this.annotationChanged();}});
      await this.reader.load(data,this.seed.reader.page,this.seed.reader.zoom);if(version===this.loadVersion){this.refreshReadingControl();this.emitReaderChange();}
      if(version===this.loadVersion&&this.pendingPage!==undefined){const page=this.pendingPage;this.pendingPage=undefined;await this.reader.go(page);}
    }catch(e){if(version!==this.loadVersion)return;this.surface.empty();const box=this.surface.createDiv('zs-file-error');setIcon(box.createDiv('zs-empty-icon'),'file-search');box.createEl('h3',{text:'暂时无法读取 PDF'});box.createEl('p',{text:message(e)});const actions=box.createDiv('zs-empty-actions');actions.createEl('button',{text:'重试'}).onclick=()=>void this.openAttachment();actions.createEl('button',{text:'关联本地 PDF'}).onclick=()=>this.addPDF();}
  }
  private renderInfo():void{
    if(!this.seed||!this.surface)return;this.loadVersion++;this.surface.empty();if(this.select)this.select.value='__info';
    renderLiteratureInfo(this.surface,this.seed);
    if(!this.seed.metadata.fields&&this.seed.source&&!this.infoLoading){this.infoLoading=true;const path=this.file?.path;const source={...this.seed.source};run(async()=>{try{const [item,children]=await Promise.all([this.plugin.client.item(source),this.plugin.client.children(source)]);const metadata=await this.plugin.client.describe(item,source,children);if(this.file?.path===path&&this.seed){this.seed.metadata={...this.seed.metadata,...metadata};this.changed();if(this.select?.value==='__info')this.renderInfo();}}finally{this.infoLoading=false;}});}
  }
  private emitReaderChange():void{if(this.file&&this.seed)this.plugin.emit('reader-change',{path:this.file.path,seed:structuredClone(this.seed)});}
  async sourcePreview(id:string):Promise<string>{return this.seed?.reader.attachmentId===id?await this.reader?.sourcePreview()||'':'';}
  readerState():ReaderState|null{if(!this.file||!this.seed)return null;const id=this.seed.reader.attachmentId;return {path:this.file.path,mode:this.select?.value==='__info'||!this.reader?.ready?'unsupported':this.reader.mode,attachmentId:id,sourceAttachmentId:this.plugin.documentTranslation?.sourceId(this.file.path,id)||id,translationId:this.reader?.translationId};}
  refreshReadingControl():void{if(!this.file||!this.seed)return;const module=this.plugin.documentTranslation,sourceId=module?.sourceId(this.file.path,this.seed.reader.attachmentId)||this.seed.reader.attachmentId;this.reader?.setDocumentMenu(!!module?.settings.replaceReadingButton&&module.hasTranslations(this.file.path,sourceId));}
  refreshAttachments():void{const info=this.select?.value==='__info';this.renderSourceOptions();if(info&&this.select)this.select.value='__info';this.refreshReadingControl();this.emitReaderChange();}
  async showAttachment(id:string,forcePDF=false):Promise<void>{if(!this.seed?.attachments.some(a=>a.id===id))throw Error('未找到 PDF 附件。');const changed=id!==this.seed.reader.attachmentId;this.seed.reader.attachmentId=id;if(forcePDF&&this.seed.reader.reading&&typeof this.seed.reader.reading==='object')(this.seed.reader.reading as {mode:string}).mode='pdf';this.changed();if(changed||!this.reader?.ready)await this.openAttachment();if(forcePDF)await this.reader?.toggleReadingMode(false);this.emitReaderChange();}
  async showReadingVersion(id:string,translationId:string|null):Promise<void>{await this.showAttachment(id);await this.showReadingTranslation(translationId?this.plugin.readingTranslations.get(translationId)||null:null);this.emitReaderChange();}
  refreshReadingTranslations():void{this.reader?.refreshTranslations();this.refreshReadingControl();this.emitReaderChange();}
  async showReadingTranslation(translation:import('./reading-api').ReadingTranslation|null):Promise<void>{if(!this.seed)return;if(translation&&translation.attachmentId!==this.seed.reader.attachmentId){this.seed.reader.attachmentId=translation.attachmentId;await this.openAttachment();}else if(!this.reader?.ready)await this.openAttachment();if(!this.reader)throw Error('请先打开文献的 PDF 附件。');await this.reader.showReadingTranslation(translation?.id||null);}
  refreshPanels():void{const previous=this.activePanel;this.renderRail();if(this.activePanel!==previous)this.renderPanel();}
  renderRail():void{
    if(!this.rail)return;this.rail.empty();
    const entries=[{id:'notes',icon:'notebook-pen',title:'笔记'},...Array.from(this.plugin.panels.values())];
    if(!entries.some(e=>e.id===this.activePanel))this.activePanel='notes';
    for(const p of entries){const b=button(this.rail,p.icon,p.title,()=>{this.activePanel=p.id;this.renderRail();this.renderPanel();});b.toggleClass('is-active',p.id===this.activePanel);b.setAttribute('aria-pressed',String(p.id===this.activePanel));}
    if(this.plugin.actions.size){this.rail.createDiv('zs-rail-spacer');for(const action of this.plugin.actions.values())button(this.rail,action.icon,action.title,()=>run(async()=>{if(this.file&&this.seed)await action.run({path:this.file.path,seed:structuredClone(this.seed)});}));}
  }
  private renderPanel():void{
    if(!this.notesHost||!this.extensionHost||!this.seed)return;this.panelCleanup?.();this.panelCleanup=undefined;this.extensionHost.empty();
    this.notesHost.hidden=this.activePanel!=='notes';this.extensionHost.hidden=this.activePanel==='notes';
    if(this.activePanel==='notes'){this.renderNotes();return;}
    const panel=this.plugin.panels.get(this.activePanel);if(panel&&this.file){try{const cleanup=panel.render(this.extensionHost.createDiv('zs-custom-panel'),{path:this.file.path,seed:structuredClone(this.seed)});if(typeof cleanup==='function')this.panelCleanup=cleanup;}catch(e){this.extensionHost.createEl('p',{text:`扩展面板加载失败：${message(e)}`});}}
  }
  private renderNotes():void{
    if(!this.notesHost||!this.seed||!this.file)return;
    this.notesHost.appendChild(this.contentEl);this.contentEl.addClass('zs-native-notes');
  }
  setNote(note:string):void{if(!this.seed||this.invalid)throw new Error('当前文献无法编辑。');this.seed.note=note;this.projecting=true;try{this.data=note;this.editor.setValue(note);}finally{this.projecting=false;}this.changed();}
  private quote(selection:Selection):void{
    if(!this.seed||!this.file)return;const attachmentId=selection.attachmentId||this.seed.reader.attachmentId;const link=this.app.fileManager.generateMarkdownLink(this.file,'',`#page=${selection.page}&attachment=${encodeURIComponent(attachmentId)}`,`第 ${selection.page} 页`);const text=`> ${selection.text.replace(/\n/g,'\n> ')}\n> — ${link}\n\n`;
    this.activePanel='notes';this.renderRail();this.renderPanel();this.editor.replaceSelection(text);this.editor.focus();this.captureNote();this.changed();
  }
  private highlight(selection:Selection):void{
    if(!this.seed)return;this.seed.annotations.push({id:crypto.randomUUID(),attachmentId:this.seed.reader.attachmentId,page:selection.page,text:selection.text,rects:selection.rects,points:selection.points,comment:'',type:selection.type||'highlight',color:selection.color||'#ffd400',createdAt:new Date().toISOString()});this.annotationChanged();
  }
  private bind():void{const path=this.file?.path;new BindModal(this.plugin,async source=>{if(!this.seed)return;const item=await this.plugin.client.item(source);if(['attachment','note','annotation'].includes(item.data.itemType))throw new Error('请绑定文献父条目的 ItemKey。');const children=await this.plugin.client.children(source);const metadata=await this.plugin.client.describe(item,source,children);if(!this.seed||this.file?.path!==path)return;const attachments=attachmentsOf(children);this.seed.source=source;this.seed.metadata={...this.seed.metadata,...metadata};this.seed.attachments=[...this.seed.attachments.filter(a=>a.kind!=='zotero'),...attachments];this.seed.reader.attachmentId=attachments[0]?.id||this.seed.attachments[0]?.id||'';this.seed.reader.page=1;this.changed();await this.save();this.renderSourceOptions();if(attachments.length)await this.openAttachment();else this.renderInfo();}).open();}
  async refresh():Promise<void>{
    if(!this.seed?.source){this.bind();return;}const version=this.loadVersion;const source={...this.seed.source};const [item,children]=await Promise.all([this.plugin.client.item(source),this.plugin.client.children(source)]);if(!this.seed||version!==this.loadVersion)return;
    const metadata=await this.plugin.client.describe(item,source,children);if(!this.seed||version!==this.loadVersion)return;const information=this.select?.value==='__info';this.seed.metadata={...this.seed.metadata,...metadata};this.seed.attachments=[...this.seed.attachments.filter(a=>a.kind!=='zotero'),...attachmentsOf(children)];if(!this.seed.attachments.some(a=>a.id===this.seed!.reader.attachmentId)){this.seed.reader.attachmentId=this.seed.attachments[0]?.id||'';this.seed.reader.page=1;}this.changed();await this.save();this.renderSourceOptions();if(information)this.renderInfo();else await this.openAttachment();new Notice('文献信息已更新。');
  }
  private addPDF():void{new PDFModal(this.app,async(kind,path)=>{if(!this.seed)return;const attachment:Attachment={id:crypto.randomUUID(),kind,path,title:path.split(/[\\/]/).pop()||'PDF',contentType:'application/pdf'};await this.plugin.readPDF(attachment,this.seed.source);this.seed.attachments.push(attachment);this.seed.reader.attachmentId=attachment.id;this.seed.reader.page=1;this.changed();this.renderSourceOptions();await this.openAttachment();}).open();}
  private openZotero():void{if(!this.seed?.source){new Notice('请先绑定 Zotero 文献。');return;}const a=this.seed.attachments.find(a=>a.id===this.seed!.reader.attachmentId);window.open(zoteroURI(this.seed.source,a?.kind==='zotero'?a.key:undefined,this.seed.reader.page));}
  private menu(anchor:HTMLElement):void{const menu=new Menu();menu.addItem(i=>i.setTitle('立即保存').setIcon('save').onClick(()=>run(()=>this.save())));menu.addItem(i=>i.setTitle('绑定文献').setIcon('link').onClick(()=>this.bind()));menu.addItem(i=>i.setTitle('在 Zotero 中打开').setIcon('external-link').onClick(()=>this.openZotero()));menu.addItem(i=>i.setTitle('导出 Markdown 笔记').setIcon('file-output').onClick(()=>run(async()=>{if(!this.seed||!this.file)return;const folder=this.file.parent?.path||'';let path=`${folder==='/'?'':folder+'/'}${this.file.basename} 笔记.md`;let n=1;while(this.app.vault.getAbstractFileByPath(path))path=`${folder==='/'?'':folder+'/'}${this.file.basename} 笔记 ${++n}.md`;const file=await this.app.vault.create(path,this.seed.note);await this.app.workspace.getLeaf('tab').openFile(file);})));const r=anchor.getBoundingClientRect();menu.showAtPosition({x:r.right-180,y:r.bottom});}
}
