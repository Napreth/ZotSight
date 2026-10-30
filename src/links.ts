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
    const original=m.getCache;const self=this;
    function getCache(this:unknown,path:string){return self.entries.get(path)?.cache||original.call(this,path);}
    m.getCache=getCache;this.register(()=>{if(m.getCache===getCache)m.getCache=original;});
    const previous=m.linkUpdaters.zsseed;
    const updater={iterateReferences:(callback:(path:string,ref:Ref)=>void)=>{for(const [path,entry] of this.entries)for(const ref of this.refs(entry.cache))callback(path,ref);},iterateReferencesForFile:(path:string,callback:(ref:Ref)=>void)=>{const e=this.entries.get(path);if(e)for(const ref of this.refs(e.cache))callback(ref);},applyUpdates:(file:TFile,updates:Update[])=>this.applyUpdates(file,updates)};
    m.linkUpdaters.zsseed=updater;this.register(()=>{if(m.linkUpdaters.zsseed===updater){if(previous)m.linkUpdaters.zsseed=previous;else delete m.linkUpdaters.zsseed;}});
    const index=(f:unknown)=>{if(f instanceof TFile&&f.extension==='zsseed')this.queue(f);else this.schedule();};
    this.registerEvent(app.vault.on('create',index));this.registerEvent(app.vault.on('modify',index));
    this.registerEvent(app.vault.on('delete',f=>{for(const path of this.entries.keys())if(path===f.path||path.startsWith(f.path+'/')){this.entries.delete(path);this.versions.set(path,(this.versions.get(path)||0)+1);delete m.resolvedLinks[path];delete m.unresolvedLinks[path];}this.schedule();}));
    this.registerEvent(app.vault.on('rename',(f,old)=>{for(const path of this.entries.keys())if(path===old||path.startsWith(old+'/')){this.entries.delete(path);this.versions.set(path,(this.versions.get(path)||0)+1);delete m.resolvedLinks[path];delete m.unresolvedLinks[path];}for(const file of app.vault.getFiles())if(file.extension==='zsseed'&&(file===f||file.path.startsWith(f.path+'/')))void this.index(file);this.schedule();}));
    this.registerEvent(m.on('resolved',()=>{if(!this.resolving){this.resolve();this.refreshGraphs();}}));
    this.registerEvent(app.workspace.on('layout-change',()=>this.refreshGraphs()));
    this.register(this.plugin.api.on('literature-change',context=>{if(context){const f=app.vault.getFileByPath(context.path);if(f)this.queue(f,context.seed.note);}}));
    void Promise.all(app.vault.getFiles().filter(f=>f.extension==='zsseed').map(f=>this.index(f))).then(()=>{if(!this.stopped)this.schedule();});
    this.refreshGraphs();
  }
  private refs(cache:CachedMetadata):Ref[]{return [...(cache.links||[]),...(cache.embeds||[]),...(cache.frontmatterLinks||[])];}
  private queue(file:TFile,note?:string):void{const path=file.path;clearTimeout(this.pending.get(path));const timer=setTimeout(()=>{this.pending.delete(path);if(!this.stopped)void this.index(file,note);},180);this.pending.set(path,timer);}
  private async index(file:TFile,note?:string):Promise<void>{
    const path=file.path,version=(this.versions.get(path)||0)+1;this.versions.set(path,version);
    try{
      if(note===undefined)note=parseSeed(await this.plugin.app.vault.read(file)).note;
      if(this.stopped||file.path!==path||version!==this.versions.get(path))return;
      if(this.entries.get(path)?.note===note)return;
      const bytes=new TextEncoder().encode(note);const cache=await (this.plugin.app.metadataCache as any).computeMetadataAsync(bytes.buffer);
      if(this.stopped||file.path!==path||version!==this.versions.get(path)||!cache)return;
      this.entries.set(path,{note,cache});this.schedule();
    }catch{if(version===this.versions.get(path)){this.entries.delete(path);delete this.plugin.app.metadataCache.resolvedLinks[path];delete this.plugin.app.metadataCache.unresolvedLinks[path];this.schedule();}}
  }
  private schedule():void{if(this.stopped)return;clearTimeout(this.timer);this.timer=setTimeout(()=>{this.resolve();this.resolving=true;try{(this.plugin.app.metadataCache as any).trigger('resolved');}finally{this.resolving=false;}this.refreshGraphs();},80);}
  private resolve():void{const m=this.plugin.app.metadataCache as any;for(const path of this.entries.keys())if(this.plugin.app.vault.getFileByPath(path))m.resolveLinks(path);}
  private async applyUpdates(file:TFile,updates:Update[]):Promise<void>{
    const change=(note:string)=>applyNoteLinkUpdates(note,updates);
    const open=this.plugin.app.workspace.getLeavesOfType('zotsight-literature').map(l=>l.view as any).find(v=>v.file?.path===file.path&&v.seed);
    if(open){const current=parseSeed(open.getViewData()).note;const note=change(current);if(note!==current){open.setNote(note);await open.save();}}
    else await this.plugin.app.vault.process(file,text=>{const seed=parseSeed(text);const note=change(seed.note);if(note===seed.note)return text;seed.note=note;seed.updatedAt=new Date().toISOString();return serializeSeed(seed);});
    await this.index(file);
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
            if(data?.nodes){for(const [path,node] of Object.entries<any>(data.nodes)){if(path.endsWith('.zsseed')){if(node.type==='attachment')node.type='';}else if(!attachments&&node.type==='attachment')delete data.nodes[path];}
              for(const node of Object.values<any>(data.nodes))for(const target of Object.keys(node.links||{}))if(!data.nodes[target])delete node.links[target];
              if(!options.showOrphans){const connected=new Set<string>();for(const [path,node] of Object.entries<any>(data.nodes))for(const target of Object.keys(node.links||{}))if(path!==target){connected.add(path);connected.add(target);}for(const path of Object.keys(data.nodes))if(!connected.has(path))delete data.nodes[path];}}
            return setData.call(this,data);
          };
          try{return render.apply(this,args);}finally{options.showAttachments=attachments;renderer.setData=setData;}
        }
        engine.render=wrapped;this.graphs.set(engine,()=>{if(engine.render===wrapped){if(inherited)delete engine.render;else engine.render=render;}});
      }
      engine.render();
    }
    for(const [engine,restore] of this.graphs)if(!engine.view?.containerEl?.isConnected){restore();this.graphs.delete(engine);}
  }
  onunload():void{this.stopped=true;clearTimeout(this.timer);for(const timer of this.pending.values())clearTimeout(timer);this.pending.clear();for(const restore of this.graphs.values())restore();this.graphs.clear();const m=this.plugin.app.metadataCache;for(const path of this.entries.keys()){delete m.resolvedLinks[path];delete m.unresolvedLinks[path];}this.entries.clear();setTimeout(()=>{(m as any).trigger('resolved');},0);}
}
