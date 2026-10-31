import { Plugin, TFile, TFolder, Notice, normalizePath, requestUrl, FileSystemAdapter } from 'obsidian';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {reflowLoader,type ReflowLoader} from './reflow-processor';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { Attachment, newSeed, parseSeed, safeFilename, Seed, serializeSeed, ZoteroSource } from './model';
import { attachmentsOf, ZoteroClient, ZoteroItem } from './zotero';
import { ZotSightView, VIEW_TYPE } from './view';
import { SearchModal, ZotSightSettings, run } from './ui';
import type { LiteratureAction, LiteratureContext, LiteraturePanel, ZotSightAPI } from './api';
import { isUnchangedLegacyProxy, legacyProxySource } from './legacy';
import { LiteratureLinks } from './links';
import type {ReadingTranslation,ReadingDocument} from './reading-api';
import {DocumentTranslation,type TranslationData} from './modules/document-translation/module';
import {PackageStore} from './package-store';
import {createPackage,binaryBuffer,packagePath} from './package';

interface Settings {apiBase:string;libraryType:'user'|'group';libraryId:string;folder:string;documentTranslation?:TranslationData;speech?:{voiceId?:string;speed?:number}}
const defaults:Settings={apiBase:'http://127.0.0.1:23119/api',libraryType:'user',libraryId:'0',folder:'文献'};
export default class ZotSightPlugin extends Plugin {
  readingLoader(win:Window,path?:string,id?:string):ReflowLoader{const adapter=this.app.vault.adapter;if(!(adapter instanceof FileSystemAdapter))throw Error('阅读模式需要桌面文件系统。');const loader=reflowLoader(join(adapter.getBasePath(),this.manifest.dir||`${this.app.vault.configDir}/plugins/zotsight`),win);return async(bytes,signal,progress)=>{const structure=await loader(bytes,signal,progress);if(path&&id){const file=this.seedFile(path);await this.store.update(file,pkg=>{pkg.set(`text/${encodeURIComponent(id)}/structure.json`,JSON.stringify(structure));pkg.set(`text/${encodeURIComponent(id)}/source.txt`,readingText(structure.content));});}return structure;};}
  documentTranslation!:DocumentTranslation;private settingsWrites=Promise.resolve();
  settings:Settings={...defaults};client!:ZoteroClient;api!:ZotSightAPI;
  panels=new Map<string,LiteraturePanel>();actions=new Map<string,LiteratureAction>();
  store!:PackageStore;
  readingTranslations=new Map<string,ReadingTranslation>();
  private listeners=new Map<string,Set<(context:LiteratureContext|null)=>void>>();
  async onload():Promise<void>{
    this.store=new PackageStore(this.app.vault);
    const vault=this.app.vault,rename=vault.rename,store=this.store;
    const renamePackage:typeof vault.rename=function(file,path){return file instanceof TFile&&['zslp','zsseed'].includes(file.extension)?store.exclusive(file,()=>rename.call(vault,file,path)):rename.call(vault,file,path);};
    vault.rename=renamePackage;this.register(()=>{if(vault.rename===renamePackage)vault.rename=rename;});
    const saved=await this.loadData()||{};const {graph,...settings}=saved;
    this.settings={...defaults,...settings};if(graph!==undefined)await this.saveSettings();
    this.client=new ZoteroClient(()=>this.settings.apiBase, async url=>{const r=await requestUrl({url,method:'GET',throw:false,headers:{'Zotero-API-Version':'3','Zotero-Allowed-Request':'true'}});let json:any;try{json=JSON.parse(r.text);}catch{}return {status:r.status,text:r.text,json};},()=>this.settings);
    this.registerView(VIEW_TYPE,leaf=>new ZotSightView(leaf,this));this.registerExtensions(['zslp','zsseed'],VIEW_TYPE);
    this.addSettingTab(new ZotSightSettings(this.app,this));
    this.addRibbonIcon('book-open','ZotSight：新建文献',()=>this.openSearch());
    this.addCommand({id:'create-literature',name:'从 Zotero 新建文献',callback:()=>this.openSearch()});
    this.addCommand({id:'migrate-packages',name:'将旧版文献转换为文献包',callback:()=>run(()=>this.migratePackages())});
    this.addCommand({id:'create-blank',name:'新建空白文献',callback:()=>run(()=>this.createBlank())});
    this.addCommand({id:'refresh-literature',name:'刷新当前文献信息',checkCallback:checking=>{const view=this.activeView();if(!view?.seed?.source)return false;if(!checking)run(()=>view.refresh());return true;}});
    this.registerEvent(this.app.workspace.on('file-menu',(menu,file)=>{if(file instanceof TFolder)menu.addItem(i=>i.setTitle('新建文献').setIcon('book-open').onClick(()=>this.openSearch(file.path)));if(file instanceof TFile&&file.extension==='pdf')menu.addItem(i=>i.setTitle('作为文献阅读').setIcon('book-open').onClick(()=>run(()=>this.createForPDF(file))));}));
    this.registerEvent(this.app.workspace.on('active-leaf-change',()=>this.emit('active-change',this.context())));
    this.api={apiVersion:'1.0.0',getActiveLiterature:()=>this.context(),getLiterature:path=>this.readSeed(path),getAttachments:async path=>(await this.readSeed(path)).attachments,getNotes:async path=>(await this.readSeed(path)).note,updateNotes:async(path,markdown)=>{
      const file=this.seedFile(path);const open=this.app.workspace.getLeavesOfType(VIEW_TYPE).map(l=>l.view as ZotSightView).find(v=>v.file?.path===path);
      if(open){open.setNote(markdown);await open.save();}else await this.store.update(file,pkg=>{const seed=pkg.seed();seed.note=markdown;seed.updatedAt=new Date().toISOString();pkg.setSeed(seed);});
    },getReaderState:path=>this.findView(path)?.readerState()||null,getDocumentVersions:path=>this.documentTranslation.versions(path),showDocumentVersion:(path,id)=>this.documentTranslation.showVersion(path,id),getPDFDocument:(path,id)=>this.getPDFDocument(path,id),getReadingDocument:(path,id,options)=>this.getReadingDocument(path,id,options),registerReadingTranslation:translation=>{
      this.seedFile(translation.path);if(this.readingTranslations.has(translation.id))throw Error('译文标识已注册。');this.readingTranslations.set(translation.id,structuredClone(translation));this.refreshReadingTranslations();return()=>{this.readingTranslations.delete(translation.id);this.refreshReadingTranslations();};
    },showReadingTranslation:async(path,id)=>{if(id!==null&&this.readingTranslations.get(id)?.path!==path)throw Error('译文未注册，请重新打开翻译任务。');let view=this.app.workspace.getLeavesOfType(VIEW_TYPE).map(l=>l.view).find(v=>v instanceof ZotSightView&&v.file?.path===path) as ZotSightView|undefined;if(!view){const leaf=this.app.workspace.getLeaf('tab');await leaf.openFile(this.seedFile(path));view=leaf.view as ZotSightView;}this.app.workspace.setActiveLeaf(view.leaf,{focus:true});await view.showReadingTranslation(id===null?null:this.readingTranslations.get(id)||null);},readPackageFile:async(path,entry)=>(await this.store.read(this.seedFile(path))).read(entry),listPackageFiles:async(path,prefix)=>(await this.store.read(this.seedFile(path))).list(prefix),writeExtensionFiles:(path,namespace,files)=>this.writeExtensionFiles(path,namespace,files),registerPackagePDF:(path,entry,title,previousPath)=>this.registerPackagePDF(path,entry,title,previousPath),showAttachment:(path,id)=>this.showAttachment(path,id),registerPDFAttachment:(path,filePath,title)=>this.registerPDFAttachment(path,filePath,title),registerPanel:panel=>this.registerExtension(this.panels,panel),registerAction:action=>this.registerExtension(this.actions,action),on:(event,callback)=>{let set=this.listeners.get(event);if(!set)this.listeners.set(event,set=new Set());set.add(callback);return()=>set?.delete(callback);}};
    this.documentTranslation=new DocumentTranslation(this);this.addChild(this.documentTranslation);await this.documentTranslation.start();
    this.app.workspace.onLayoutReady(()=>{this.addChild(new LiteratureLinks(this));run(async()=>{for(const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)){const state=leaf.getViewState();const path=state.state?.file;if(typeof path==='string'&&this.app.vault.getFileByPath(path)?.extension==='md')await leaf.setViewState({...state,type:'markdown',active:leaf===this.app.workspace.activeLeaf});}await this.cleanLegacyProxies();await this.migratePackages();});});
  }
  onunload():void{this.emit('unload',null);this.listeners.clear();for(const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)){const view=leaf.view;if(view instanceof ZotSightView)run(async()=>{try{await view.save();}finally{await view.dispose();}});}this.panels.clear();this.actions.clear();this.readingTranslations.clear();}
  private refreshReadingTranslations():void{for(const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE))if(leaf.view instanceof ZotSightView)leaf.view.refreshReadingTranslations();}
  private async getReadingDocument(path:string,id?:string,options:{signal?:AbortSignal;onProgress?:(message:string)=>void}={}):Promise<ReadingDocument>{const seed=await this.readSeed(path);const attachment=seed.attachments.find(a=>a.id===(id||seed.reader.attachmentId))||(!id?seed.attachments[0]:undefined);if(!attachment)throw Error('这份文献没有所选 PDF 附件。');const pdf=await this.readPDF(attachment,seed.source,path);const signal=options.signal||new AbortController().signal;const structure=await this.readingLoader(window)(pdf,signal,options.onProgress||(()=>{}));await this.store.update(this.seedFile(path),pkg=>{pkg.set(`text/${encodeURIComponent(attachment.id)}/structure.json`,JSON.stringify(structure));pkg.set(`text/${encodeURIComponent(attachment.id)}/source.txt`,readingText(structure.content));});return {attachmentId:attachment.id,sourceHash:structure.metadata.source.hash,structure,pdf};}
  private async registerPDFAttachment(path:string,filePath:string,title:string):Promise<Attachment>{const pdf=this.app.vault.getFileByPath(filePath);if(!pdf||pdf.extension.toLowerCase()!=='pdf')throw Error('译文 PDF 尚未保存到库内。');let result:Attachment|undefined;const update=(seed:Seed)=>{result=seed.attachments.find(a=>a.kind==='vault'&&a.path===filePath);if(!result){result={id:crypto.randomUUID(),title,kind:'vault',path:filePath,contentType:'application/pdf'};seed.attachments.push(result);}seed.updatedAt=new Date().toISOString();};const view=this.app.workspace.getLeavesOfType(VIEW_TYPE).map(l=>l.view).find(v=>v instanceof ZotSightView&&v.file?.path===path) as ZotSightView|undefined;if(view?.seed){update(view.seed);await view.save();view.refreshAttachments();}else await this.store.update(this.seedFile(path),pkg=>{const seed=pkg.seed();update(seed);pkg.setSeed(seed);});return structuredClone(result!);}
  async saveSettings():Promise<void>{const snapshot=structuredClone(this.settings);this.settingsWrites=this.settingsWrites.catch(()=>{}).then(()=>this.saveData(snapshot));await this.settingsWrites;}
  findView(path?:string):ZotSightView|null{const active=this.activeView();if(active&&(!path||active.file?.path===path))return active;return this.app.workspace.getLeavesOfType(VIEW_TYPE).map(l=>l.view).find(v=>v instanceof ZotSightView&&v.file?.path===path) as ZotSightView||null;}
  async openLiterature(path:string):Promise<void>{let view=this.findView(path);if(!view){const leaf=this.app.workspace.getLeaf('tab');await leaf.openFile(this.seedFile(path));view=leaf.view as ZotSightView;}this.app.workspace.setActiveLeaf(view.leaf,{focus:true});}
  refreshReadingControls():void{for(const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE))if(leaf.view instanceof ZotSightView)leaf.view.refreshReadingControl();}
  private async getPDFDocument(path:string,id?:string){const seed=await this.readSeed(path),attachment=seed.attachments.find(a=>a.id===(id||seed.reader.attachmentId));if(!attachment)throw Error('未找到 PDF 附件。');const pdf=await this.readPDF(attachment,seed.source,path);return {attachmentId:attachment.id,sourceHash:createHash('md5').update(pdf).digest('hex'),pdf};}
  activeView():ZotSightView|null{return this.app.workspace.getActiveViewOfType(ZotSightView);}
  context():LiteratureContext|null{const v=this.activeView();return v?.seed&&v.file?{path:v.file.path,seed:structuredClone(v.seed)}:null;}
  emit(event:string,context:LiteratureContext|null):void{for(const callback of this.listeners.get(event)||[]){try{callback(context);}catch(e){console.error('ZotSight extension',e);}}}
  private registerExtension<T extends {id:string}>(map:Map<string,T>,entry:T):()=>void{if(map.has(entry.id))throw new Error(`扩展 ID 已注册：${entry.id}`);map.set(entry.id,entry);this.refreshExtensions();return()=>{if(map.get(entry.id)===entry){map.delete(entry.id);this.refreshExtensions();}};}
  private refreshExtensions():void{for(const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE))if(leaf.view instanceof ZotSightView)leaf.view.refreshPanels();}
  openSearch(folder?:string):void{new SearchModal(this,(item,source)=>this.createFromItem(item,source,folder),folder).open();}
  async createFromItem(item:ZoteroItem,source?:ZoteroSource,folder?:string):Promise<void>{
    source ||= {provider:'zotero',libraryType:this.settings.libraryType,libraryId:this.settings.libraryId,itemKey:item.key};
    if(item.data.itemType==='attachment'&&item.data.parentItem){source={...source,itemKey:item.data.parentItem};item=await this.client.item(source);}
    if(['attachment','note','annotation'].includes(item.data.itemType))throw new Error('请选择文献条目，PDF 附件应绑定其父条目。');
    const seed=newSeed();seed.source=source;const children=await this.client.children(source);seed.metadata=await this.client.describe(item,source,children);
    seed.attachments=attachmentsOf(children);seed.reader.attachmentId=seed.attachments[0]?.id||'';
    await this.createSeed(seed,folder);
  }
  async createBlank():Promise<void>{await this.createSeed(newSeed());}
  async createForPDF(file:TFile):Promise<void>{const seed=newSeed(file.basename);seed.attachments=[{id:crypto.randomUUID(),kind:'vault',path:file.path,title:file.name}];seed.reader.attachmentId=seed.attachments[0].id;await this.createSeed(seed);}
  async createSeed(seed:Seed,folder=this.settings.folder):Promise<void>{
    folder=normalizePath(folder||'').replace(/^\/+|\/+$/g,'');await this.ensureFolder(folder);const base=safeFilename(seed.metadata.title);const prefix=folder?`${folder}/`:'';let path=`${prefix}${base}.zslp`;let n=1;while(this.app.vault.getAbstractFileByPath(path))path=`${prefix}${base} ${++n}.zslp`;
    const file=await this.app.vault.createBinary(path,binaryBuffer(createPackage(seed)));await this.app.workspace.getLeaf('tab').openFile(file);
  }
  seedFile(path:string):TFile{const f=this.app.vault.getAbstractFileByPath(path);if(!(f instanceof TFile)||!['zslp','zsseed'].includes(f.extension))throw new Error('未找到 ZotSight 文献文件。');return f;}
  async readSeed(path:string):Promise<Seed>{const open=this.app.workspace.getLeavesOfType(VIEW_TYPE).map(l=>l.view as ZotSightView).find(v=>v.file?.path===path&&v.seed);return open?.seed?structuredClone(open.seed):(await this.store.read(this.seedFile(path))).seed();}
  async readPDF(attachment:Attachment,source:ZoteroSource|null,packageFile?:string):Promise<Uint8Array>{
    if(attachment.kind!=='package'&&packageFile){const entry=`attachments/${encodeURIComponent(attachment.id)}`,signature=JSON.stringify({kind:attachment.kind,path:attachment.path,key:attachment.key,source:attachment.kind==='zotero'&&source?{libraryType:source.libraryType,libraryId:source.libraryId,itemKey:source.itemKey}:null});let bytes:Uint8Array;try{bytes=await this.readSourcePDF(attachment,source);}catch(error){const pkg=await this.store.read(this.seedFile(packageFile));if(pkg.text(`${entry}/identity.json`)===signature){const cached=pkg.read(`${entry}/original.pdf`);if(cached)return cached;}throw error;}await this.store.update(this.seedFile(packageFile),pkg=>{pkg.set(`${entry}/original.pdf`,bytes);pkg.set(`${entry}/identity.json`,signature);});return bytes;}
    if(attachment.kind==='package'){if(!packageFile)throw Error('缺少文献包路径。');const bytes=(await this.store.read(this.seedFile(packageFile))).read(attachment.path||'');if(!bytes)throw Error('文献包中的 PDF 不存在。');return bytes;}
    return this.readSourcePDF(attachment,source);
  }
  private async readSourcePDF(attachment:Attachment,source:ZoteroSource|null):Promise<Uint8Array>{
    if(attachment.kind==='vault'){const f=this.app.vault.getAbstractFileByPath(attachment.path||'');if(!(f instanceof TFile))throw new Error('库内 PDF 不存在，请重新关联。');return new Uint8Array(await this.app.vault.readBinary(f));}
    let path=attachment.path;
    if(attachment.kind==='zotero'){if(!source||!attachment.key)throw new Error('尚未绑定 Zotero 文献。');path=fileURLToPath(await this.client.attachmentURL(source,attachment.key));}
    if(!path||!(/\.pdf$/i.test(path)))throw new Error('PDF 路径无效。');
    try{return new Uint8Array(await readFile(path));}catch{throw new Error('无法读取本地 PDF。请确认文件已下载且路径有效，或重新关联。');}
  }
  async writeExtensionFiles(path:string,namespace:string,files:Record<string,Uint8Array|string>):Promise<void>{
    if(!/^[a-z][a-z0-9-]{0,40}$/.test(namespace)||['text','notes','attachments'].includes(namespace))throw Error('扩展目录无效。');
    const entries=Object.entries(files).map(([name,data])=>[`${namespace}/${packagePath(name)}`,data] as const);
    await this.store.update(this.seedFile(path),pkg=>{for(const [name,data] of entries)pkg.set(name,data);});
  }
  private async registerPackagePDF(path:string,entry:string,title:string,previousPath?:string):Promise<Attachment>{
    packagePath(entry);if(!entry.startsWith('translate/')||!entry.toLowerCase().endsWith('.pdf'))throw Error('译文 PDF 必须位于 translate/ 中。');
    const archive=await this.store.read(this.seedFile(path)),bytes=archive.read(entry);let job:any;try{job=JSON.parse(archive.text(entry.split('/').slice(0,2).join('/')+'/job.json')||'null');}catch{}if(!bytes||new TextDecoder().decode(bytes.subarray(0,5))!=='%PDF-')throw Error('包内译文 PDF 无效。');
    let result!:Attachment;const update=(seed:Seed)=>{result=seed.attachments.find(a=>a.kind==='package'&&a.path===entry||!!previousPath&&a.kind==='vault'&&a.path===previousPath)!;if(result){result.kind='package';result.path=entry;result.title=title;}if(!result){result={id:crypto.randomUUID(),kind:'package',path:entry,title,contentType:'application/pdf'};seed.attachments.push(result);}if(job?.attachmentId){result.sourceAttachmentId=job.attachmentId;result.language=job.targetLanguage;result.translationJobId=job.id;}};
    const view=this.app.workspace.getLeavesOfType(VIEW_TYPE).map(l=>l.view).find(v=>v instanceof ZotSightView&&v.file?.path===path) as ZotSightView|undefined;
    if(view?.seed){update(view.seed);await view.save();view.refreshAttachments();}else await this.store.update(this.seedFile(path),pkg=>{const seed=pkg.seed();update(seed);pkg.setSeed(seed);});return structuredClone(result);
  }
  private async showAttachment(path:string,id:string):Promise<void>{let view=this.app.workspace.getLeavesOfType(VIEW_TYPE).map(l=>l.view).find(v=>v instanceof ZotSightView&&v.file?.path===path) as ZotSightView|undefined;if(!view){const leaf=this.app.workspace.getLeaf('tab');await leaf.openFile(this.seedFile(path));view=leaf.view as ZotSightView;}this.app.workspace.setActiveLeaf(view.leaf,{focus:true});await view.showAttachment(id);}
  async migratePackages():Promise<void>{
    for(const file of this.app.vault.getFiles().filter(f=>f.extension==='zsseed')){
      const target=file.path.replace(/\.zsseed$/i,'.zslp');if(this.app.vault.getAbstractFileByPath(target))continue;
      try{for(const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)){const view=leaf.view;if(view instanceof ZotSightView&&view.file===file)await view.save();}
        const original=await this.app.vault.read(file);parseSeed(original);
        // Keep an exact recovery copy outside the visible vault file tree.
        const folder=`${this.app.vault.configDir}/plugins/zotsight/migration-backups`;await this.app.vault.adapter.mkdir(folder).catch(()=>{});
        const id=createHash('sha256').update(file.path).digest('hex'),backup=`${folder}/${id}.json`;if(!await this.app.vault.adapter.exists(backup)){await this.app.vault.adapter.write(backup,original);await this.app.vault.adapter.write(`${folder}/${id}.path.txt`,file.path);}
        // Rename first: Obsidian updates inbound links and retains the open leaf.
        await this.store.migrate(file,()=>this.app.fileManager.renameFile(file,target));
      }catch(error){console.error('ZotSight package migration',file.path,error);new Notice(`文献包转换失败，请检查原文件与恢复备份：${file.path}`);}
    }
  }
  async ensureFolder(path:string):Promise<void>{if(!path||path==='/')return;let current='';for(const part of path.split('/')){if(!part)continue;current=current?`${current}/${part}`:part;const entry=this.app.vault.getAbstractFileByPath(current);if(!entry){try{await this.app.vault.createFolder(current);}catch(e){if(!this.app.vault.getAbstractFileByPath(current))throw e;}}else if(!(entry instanceof TFolder))throw new Error(`路径被文件占用：${current}`);}}
  private async cleanLegacyProxies():Promise<void>{
    let removed=0;
    for(const file of this.app.vault.getFiles().filter(f=>f.parent?.path==='文献图谱'&&f.extension==='md')){
      const markdown=await this.app.vault.read(file);const path=legacyProxySource(markdown);if(!path)continue;
      const source=this.app.vault.getAbstractFileByPath(path);if(!(source instanceof TFile)||source.extension!=='zsseed')continue;
      let seed:Seed;try{seed=parseSeed(await this.app.vault.read(source));}catch{continue;}
      if(isUnchangedLegacyProxy(markdown,path,seed)){await this.app.vault.trash(file,false);removed++;}
    }
    const folder=this.app.vault.getAbstractFileByPath('文献图谱');if(folder instanceof TFolder&&folder.children.length===0)await this.app.vault.trash(folder,false);
    if(removed)new Notice(`已将 ${removed} 个旧版映射文件移入库内回收站。`);
  }
}

function readingText(value:unknown):string{if(Array.isArray(value))return value.map(readingText).filter(Boolean).join(value.every(n=>n&&typeof n==='object'&&'text' in n)?'':'\n');if(value&&typeof value==='object'){const obj=value as Record<string,unknown>;if(typeof obj.text==='string')return obj.text;return Object.entries(obj).filter(([k])=>['content','children','paragraphs','lines','words'].includes(k)).map(([,v])=>readingText(v)).filter(Boolean).join("\n");}return '';}
