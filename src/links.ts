import { Component, TFile } from 'obsidian';
import type { CachedMetadata } from 'obsidian';
import type ZotSightPlugin from './main';
import { parseSeed, serializeSeed } from './model';
import {applyNoteLinkUpdates} from './link-updates';

type Ref={link:string;original:string;position?:{start:{offset:number};end:{offset:number}}};
interface Update {reference:Ref;change:string}
interface Entry {note:string;cache:CachedMetadata}

// Obsidian has no public custom-file metadata registration API. Keep the
// compatibility hooks instance-scoped, reversible, and out of the on-disk cache.
export class LiteratureLinks extends Component {
  private entries=new Map<string,Entry>();private versions=new Map<string,number>();
  private stopped=false;private resolving=false;private timer?:ReturnType<typeof setTimeout>;
  private graphs=new Map<any,()=>void>();
  private pending=new Map<string,ReturnType<typeof setTimeout>>();
  constructor(private plugin:ZotSightPlugin){super();}
  onload():void{
    const {app}=this.plugin;const m=app.metadataCache as any;
    if(typeof m.computeMetadataAsync!=='function'||typeof m.resolveLinks!=='function'||!m.linkUpdaters)return;
    const original=m.getCache,cachedFiles=m.getCachedFiles;const self=this;
    function getCache(this:unknown,path:string){return self.entries.get(path)?.cache||original.call(this,path);}
    m.getCache=getCache;this.register(()=>{if(m.getCache===getCache)m.getCache=original;});
    function getCachedFiles(this:unknown){return [...new Set<string>([...cachedFiles.call(this),...self.entries.keys()])];}
    m.getCachedFiles=getCachedFiles;this.register(()=>{if(m.getCachedFiles===getCachedFiles)m.getCachedFiles=cachedFiles;});
    this.installLinkNames();
    const previous={zslp:m.linkUpdaters.zslp,zsseed:m.linkUpdaters.zsseed};
    const updater={iterateReferences:(callback:(path:string,ref:Ref)=>void)=>{for(const [path,entry] of this.entries)for(const ref of this.refs(entry.cache))callback(path,ref);},iterateReferencesForFile:(path:string,callback:(ref:Ref)=>void)=>{const e=this.entries.get(path);if(e)for(const ref of this.refs(e.cache))callback(ref);},applyUpdates:(file:TFile,updates:Update[])=>this.applyUpdates(file,updates)};
    for(const ext of ['zslp','zsseed'] as const){m.linkUpdaters[ext]=updater;this.register(()=>{if(m.linkUpdaters[ext]===updater){if(previous[ext])m.linkUpdaters[ext]=previous[ext];else delete m.linkUpdaters[ext];}});}
    const index=(f:unknown)=>{if(f instanceof TFile&&['zslp','zsseed'].includes(f.extension))this.queue(f);else this.schedule();};
    this.registerEvent(app.vault.on('create',index));this.registerEvent(app.vault.on('modify',index));
    this.registerEvent(app.vault.on('delete',f=>{for(const path of this.entries.keys())if(path===f.path||path.startsWith(f.path+'/')){this.entries.delete(path);this.versions.set(path,(this.versions.get(path)||0)+1);delete m.resolvedLinks[path];delete m.unresolvedLinks[path];}this.schedule();}));
    this.registerEvent(app.vault.on('rename',(f,old)=>{for(const path of this.entries.keys())if(path===old||path.startsWith(old+'/')){this.entries.delete(path);this.versions.set(path,(this.versions.get(path)||0)+1);delete m.resolvedLinks[path];delete m.unresolvedLinks[path];}for(const file of app.vault.getFiles())if(['zslp','zsseed'].includes(file.extension)&&(file===f||file.path.startsWith(f.path+'/')))void this.index(file);this.schedule();}));
    this.registerEvent(m.on('resolved',()=>{if(!this.resolving){this.resolve();this.refreshGraphs();}}));
    this.registerEvent(app.workspace.on('layout-change',()=>this.refreshGraphs()));
    this.register(this.plugin.api.on('literature-change',context=>{if(context){const f=app.vault.getFileByPath(context.path);if(f)this.queue(f,context.seed.note);}}));
    void Promise.all(app.vault.getFiles().filter(f=>['zslp','zsseed'].includes(f.extension)).map(f=>this.index(f))).then(()=>{if(!this.stopped)this.schedule();});
    this.refreshGraphs();
  }
  private refs(cache:CachedMetadata):Ref[]{return [...(cache.links||[]),...(cache.embeds||[]),...(cache.frontmatterLinks||[])];}
  private queue(file:TFile,note?:string):void{const path=file.path;clearTimeout(this.pending.get(path));const timer=setTimeout(()=>{this.pending.delete(path);if(!this.stopped)void this.index(file,note);},180);this.pending.set(path,timer);}
  private async index(file:TFile,note?:string):Promise<void>{
    const path=file.path,version=(this.versions.get(path)||0)+1;this.versions.set(path,version);
    try{
      if(note===undefined)note=(await this.plugin.store.read(file)).seed().note;
      if(this.stopped||file.path!==path||version!==this.versions.get(path))return;
      if(this.entries.get(path)?.note===note)return;
      const bytes=new TextEncoder().encode(note);const cache=await (this.plugin.app.metadataCache as any).computeMetadataAsync(bytes.buffer);
      if(this.stopped||file.path!==path||version!==this.versions.get(path)||!cache)return;
      this.entries.set(path,{note,cache});this.schedule();
    }catch{if(version===this.versions.get(path)){this.entries.delete(path);delete this.plugin.app.metadataCache.resolvedLinks[path];delete this.plugin.app.metadataCache.unresolvedLinks[path];this.schedule();}}
  }
  private schedule():void{if(this.stopped)return;clearTimeout(this.timer);this.timer=setTimeout(()=>{this.resolve();this.resolving=true;try{(this.plugin.app.metadataCache as any).trigger('resolved');}finally{this.resolving=false;}this.refreshGraphs();},80);}
  private resolve():void{const m=this.plugin.app.metadataCache as any;for(const path of this.entries.keys())if(this.plugin.app.vault.getFileByPath(path))m.resolveLinks(path);for(const [path,links] of Object.entries<Record<string,number>>(m.unresolvedLinks))if(path.endsWith('.md')&&Object.keys(links).some(link=>m.getFirstLinkpathDest(link,path)?.extension==='zslp'))m.resolveLinks(path);}
  private async applyUpdates(file:TFile,updates:Update[]):Promise<void>{
    const change=(note:string)=>applyNoteLinkUpdates(note,updates);
    const open=this.plugin.app.workspace.getLeavesOfType('zotsight-literature').map(l=>l.view as any).find(v=>v.file?.path===file.path&&v.seed);
    if(open){const current=parseSeed(open.getViewData()).note;const note=change(current);if(note!==current){open.setNote(note);await open.save();}}
    else{const seed=await this.plugin.readSeed(file.path);const note=change(seed.note);if(note!==seed.note)await this.plugin.api.updateNotes(file.path,note);}
    await this.index(file);
  }
  private installLinkNames():void{
    const m=this.plugin.app.metadataCache as any,original=m.getLinkpathDest,text=m.fileToLinktext;
    function resolve(this:any,path:string,source:string){const found=original.call(this,path,source);if(found?.length)return found;if(/\.zsseed$/i.test(path))return original.call(this,path.replace(/\.zsseed$/i,'.zslp'),source);if(/\.zslp$/i.test(path))return found;const packages=original.call(this,path+'.zslp',source);return packages?.length?packages:original.call(this,path+'.zsseed',source);}
    function linktext(this:any,file:TFile,source:string,omit?:boolean){const result=text.call(this,file,source,omit);if(!['zslp','zsseed'].includes(file.extension))return result;const short=result.replace(/\.(zslp|zsseed)$/i,'');return this.getFirstLinkpathDest(short,source)===file?short:result;}
    m.getLinkpathDest=resolve;m.fileToLinktext=linktext;
    this.register(()=>{if(m.getLinkpathDest===resolve)m.getLinkpathDest=original;if(m.fileToLinktext===linktext)m.fileToLinktext=text;});
    const manager=this.plugin.app.fileManager,generate=manager.generateMarkdownLink;
    const generateLink:typeof generate=(file,source,subpath,alias)=>generate.call(manager,file,source,subpath,['zslp','zsseed'].includes(file.extension)?alias||file.basename:alias);
    manager.generateMarkdownLink=generateLink;this.register(()=>{if(manager.generateMarkdownLink===generateLink)manager.generateMarkdownLink=generate;});
  }
  private graphNodes=new Map<any,()=>void>();
  private updateGraphLabels(renderer:any):void{
    for(const node of renderer.nodes||[]){if(!/\.(zslp|zsseed)$/i.test(node.id)||this.graphNodes.has(node))continue;
      const original=node.getDisplayText;node.getDisplayText=()=>node.id.split('/').pop().replace(/\.(zslp|zsseed)$/i,'');if(node.text)node.text.text=node.getDisplayText();
      this.graphNodes.set(node,()=>{node.getDisplayText=original;if(node.text)node.text.text=original.call(node);});
    }renderer.changed?.();
    for(const node of this.graphNodes.keys())if(!renderer.nodes?.includes(node)&&node.renderer===renderer)this.graphNodes.delete(node);
  }
  private refreshGraphs():void{
    if(this.stopped)return;const workspace=this.plugin.app.workspace;
    for(const type of ['graph','localgraph'])for(const leaf of workspace.getLeavesOfType(type)){
      const view=leaf.view as any,engine=view.dataEngine||view.engine;if(!engine?.options||typeof engine.render!=='function'||typeof engine.renderer?.setData!=='function')continue;
      if(!this.graphs.has(engine)){
        const inherited=!Object.prototype.hasOwnProperty.call(engine,'render');const render=engine.render;const self=this;
        function wrapped(this:any,...args:any[]){
          if(!self.entries.size)return render.apply(this,args);
          const options=this.options,attachments=options.showAttachments,renderer=this.renderer,setData=renderer.setData;
          options.showAttachments=true;
          renderer.setData=function(data:any){
            if(data?.nodes){for(const [path,node] of Object.entries<any>(data.nodes)){if(/\.(zslp|zsseed)$/i.test(path)){if(node.type==='attachment')node.type='';}else if(!attachments&&node.type==='attachment')delete data.nodes[path];}
              for(const node of Object.values<any>(data.nodes))for(const target of Object.keys(node.links||{}))if(!data.nodes[target])delete node.links[target];
              if(!options.showOrphans){const connected=new Set<string>();for(const [path,node] of Object.entries<any>(data.nodes))for(const target of Object.keys(node.links||{}))if(path!==target){connected.add(path);connected.add(target);}for(const path of Object.keys(data.nodes))if(!connected.has(path))delete data.nodes[path];}}
            const result=setData.call(this,data);self.updateGraphLabels(this);return result;
          };
          try{return render.apply(this,args);}finally{options.showAttachments=attachments;renderer.setData=setData;}
        }
        engine.render=wrapped;this.graphs.set(engine,()=>{if(engine.render===wrapped){if(inherited)delete engine.render;else engine.render=render;}});
      }
      engine.render();
    }
    for(const [engine,restore] of this.graphs)if(!engine.view?.containerEl?.isConnected){restore();this.graphs.delete(engine);}
  }
  onunload():void{this.stopped=true;clearTimeout(this.timer);for(const timer of this.pending.values())clearTimeout(timer);this.pending.clear();for(const restore of this.graphs.values())restore();this.graphs.clear();for(const restore of this.graphNodes.values())restore();this.graphNodes.clear();const m=this.plugin.app.metadataCache;for(const path of this.entries.keys()){delete m.resolvedLinks[path];delete m.unresolvedLinks[path];}this.entries.clear();setTimeout(()=>{(m as any).trigger('resolved');},0);}
}
