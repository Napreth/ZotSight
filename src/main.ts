import { Plugin, TFile, TFolder, Notice, normalizePath, requestUrl, FileSystemAdapter } from 'obsidian';
import {join} from 'node:path';
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

interface Settings {apiBase:string;libraryType:'user'|'group';libraryId:string;folder:string}
const defaults:Settings={apiBase:'http://127.0.0.1:23119/api',libraryType:'user',libraryId:'0',folder:'文献'};
export default class ZotSightPlugin extends Plugin {
  readingLoader(win:Window):ReflowLoader{const adapter=this.app.vault.adapter;if(!(adapter instanceof FileSystemAdapter))throw Error('阅读模式需要桌面文件系统。');return reflowLoader(join(adapter.getBasePath(),this.manifest.dir||`${this.app.vault.configDir}/plugins/zotsight`),win);}
  settings:Settings={...defaults};client!:ZoteroClient;api!:ZotSightAPI;
  panels=new Map<string,LiteraturePanel>();actions=new Map<string,LiteratureAction>();
  private listeners=new Map<string,Set<(context:LiteratureContext|null)=>void>>();
  async onload():Promise<void>{
    const saved=await this.loadData()||{};const {graph,...settings}=saved;
    this.settings={...defaults,...settings};if(graph!==undefined)await this.saveSettings();
    this.client=new ZoteroClient(()=>this.settings.apiBase, async url=>{const r=await requestUrl({url,method:'GET',throw:false,headers:{'Zotero-API-Version':'3','Zotero-Allowed-Request':'true'}});let json:any;try{json=JSON.parse(r.text);}catch{}return {status:r.status,text:r.text,json};},()=>this.settings);
    this.registerView(VIEW_TYPE,leaf=>new ZotSightView(leaf,this));this.registerExtensions(['zsseed'],VIEW_TYPE);
    this.addSettingTab(new ZotSightSettings(this.app,this));
    this.addRibbonIcon('book-open','ZotSight：新建文献',()=>this.openSearch());
    this.addCommand({id:'create-literature',name:'从 Zotero 新建文献',callback:()=>this.openSearch()});
    this.addCommand({id:'create-blank',name:'新建空白文献',callback:()=>run(()=>this.createBlank())});
    this.addCommand({id:'refresh-literature',name:'刷新当前文献信息',checkCallback:checking=>{const view=this.activeView();if(!view?.seed?.source)return false;if(!checking)run(()=>view.refresh());return true;}});
    this.registerEvent(this.app.workspace.on('file-menu',(menu,file)=>{if(file instanceof TFolder)menu.addItem(i=>i.setTitle('新建文献').setIcon('book-open').onClick(()=>this.openSearch(file.path)));if(file instanceof TFile&&file.extension==='pdf')menu.addItem(i=>i.setTitle('作为文献阅读').setIcon('book-open').onClick(()=>run(()=>this.createForPDF(file))));}));
    this.registerEvent(this.app.workspace.on('active-leaf-change',()=>this.emit('active-change',this.context())));
    this.api={apiVersion:'1.0.0',getActiveLiterature:()=>this.context(),getLiterature:path=>this.readSeed(path),getAttachments:async path=>(await this.readSeed(path)).attachments,getNotes:async path=>(await this.readSeed(path)).note,updateNotes:async(path,markdown)=>{
      const file=this.seedFile(path);const open=this.app.workspace.getLeavesOfType(VIEW_TYPE).map(l=>l.view as ZotSightView).find(v=>v.file?.path===path);
      if(open){open.setNote(markdown);await open.save();}else{await this.app.vault.process(file,text=>{const seed=parseSeed(text);seed.note=markdown;seed.updatedAt=new Date().toISOString();return serializeSeed(seed);});}
    },registerPanel:panel=>this.registerExtension(this.panels,panel),registerAction:action=>this.registerExtension(this.actions,action),on:(event,callback)=>{let set=this.listeners.get(event);if(!set)this.listeners.set(event,set=new Set());set.add(callback);return()=>set?.delete(callback);}};
    this.app.workspace.onLayoutReady(()=>{this.addChild(new LiteratureLinks(this));run(async()=>{for(const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)){const state=leaf.getViewState();const path=state.state?.file;if(typeof path==='string'&&this.app.vault.getFileByPath(path)?.extension==='md')await leaf.setViewState({...state,type:'markdown',active:leaf===this.app.workspace.activeLeaf});}await this.cleanLegacyProxies();});});
  }
  onunload():void{this.emit('unload',null);this.listeners.clear();for(const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)){const view=leaf.view;if(view instanceof ZotSightView)run(async()=>{try{await view.save();}finally{await view.dispose();}});}this.panels.clear();this.actions.clear();}
  async saveSettings():Promise<void>{await this.saveData(this.settings);}
  activeView():ZotSightView|null{return this.app.workspace.getActiveViewOfType(ZotSightView);}
  context():LiteratureContext|null{const v=this.activeView();return v?.seed&&v.file?{path:v.file.path,seed:structuredClone(v.seed)}:null;}
  emit(event:string,context:LiteratureContext|null):void{for(const callback of this.listeners.get(event)||[]){try{callback(context);}catch(e){console.error('ZotSight extension',e);}}}
  private registerExtension<T extends {id:string}>(map:Map<string,T>,entry:T):()=>void{if(map.has(entry.id))throw new Error(`扩展 ID 已注册：${entry.id}`);map.set(entry.id,entry);this.refreshExtensions();return()=>{if(map.get(entry.id)===entry){map.delete(entry.id);this.refreshExtensions();}};}
  private refreshExtensions():void{for(const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE))if(leaf.view instanceof ZotSightView)leaf.view.renderRail();}
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
    folder=normalizePath(folder||'').replace(/^\/+|\/+$/g,'');await this.ensureFolder(folder);const base=safeFilename(seed.metadata.title);const prefix=folder?`${folder}/`:'';let path=`${prefix}${base}.zsseed`;let n=1;while(this.app.vault.getAbstractFileByPath(path))path=`${prefix}${base} ${++n}.zsseed`;
    const file=await this.app.vault.create(path,serializeSeed(seed));await this.app.workspace.getLeaf('tab').openFile(file);
  }
  seedFile(path:string):TFile{const f=this.app.vault.getAbstractFileByPath(path);if(!(f instanceof TFile)||f.extension!=='zsseed')throw new Error('未找到 ZotSight 文献文件。');return f;}
  async readSeed(path:string):Promise<Seed>{const open=this.app.workspace.getLeavesOfType(VIEW_TYPE).map(l=>l.view as ZotSightView).find(v=>v.file?.path===path&&v.seed);return open?.seed?structuredClone(open.seed):parseSeed(await this.app.vault.read(this.seedFile(path)));}
  async readPDF(attachment:Attachment,source:ZoteroSource|null):Promise<Uint8Array>{
    if(attachment.kind==='vault'){const f=this.app.vault.getAbstractFileByPath(attachment.path||'');if(!(f instanceof TFile))throw new Error('库内 PDF 不存在，请重新关联。');return new Uint8Array(await this.app.vault.readBinary(f));}
    let path=attachment.path;
    if(attachment.kind==='zotero'){if(!source||!attachment.key)throw new Error('尚未绑定 Zotero 文献。');path=fileURLToPath(await this.client.attachmentURL(source,attachment.key));}
    if(!path||!(/\.pdf$/i.test(path)))throw new Error('PDF 路径无效。');
    try{return new Uint8Array(await readFile(path));}catch{throw new Error('无法读取本地 PDF。请确认文件已下载且路径有效，或重新关联。');}
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
