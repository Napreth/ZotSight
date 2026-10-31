import {mkdir,writeFile,readFile,access} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import type {ZotSightAPI,Job} from './types';
import {checkAbort,message} from './types';
import type {Backend} from './backend';
import {artifactPath} from './artifacts';
import {detectArxiv} from './arxiv';
import type {SourceInfo} from './choices';

interface SourceHost {root:string;core:()=>ZotSightAPI;backend:Backend;jobs:()=>Job[];download:(url:string,signal:AbortSignal)=>Promise<Uint8Array>;preview:(path:string,id:string)=>Promise<string>;changed:()=>void}
export class DocumentSources {
  private entries=new Map<string,{info:SourceInfo;controller:AbortController;work:Promise<SourceInfo>}>();
  constructor(private host:SourceHost){}
  inspect(path:string,id:string,automatic:boolean):SourceInfo{const key=path+'|'+id;let entry=this.entries.get(key);if(!entry){const controller=new AbortController(),info:SourceInfo={attachmentId:id,hasLatex:false,phase:'checking',message:'正在识别文档…'};entry={info,controller,work:Promise.resolve(info)};this.entries.set(key,entry);entry.work=this.read(path,id,automatic,controller.signal,info).catch(error=>{if(!controller.signal.aborted){info.phase='error';info.message=message(error);this.host.changed();}return info;});}return entry.info;}
  reset(path?:string):void{for(const [key,entry] of this.entries)if(!path||key.startsWith(path+'|')){entry.controller.abort();this.entries.delete(key);}}
  async prepare(path:string,id:string,signal:AbortSignal):Promise<SourceInfo>{const entry=this.entries.get(path+'|'+id);if(entry)await entry.work;checkAbort(signal);const info:SourceInfo=entry?.info||{attachmentId:id,hasLatex:false,phase:'checking',message:'准备 LaTeX 源文件…'};try{await this.read(path,id,true,signal,info,true);if(!info.hasLatex||!info.prefix)throw Error(info.message||'没有可用的 LaTeX 源文件。');return info;}catch(error){info.phase='error';info.message=message(error);this.host.changed();throw error;}}
  private async read(path:string,id:string,automatic:boolean,signal:AbortSignal,info:SourceInfo,required=false):Promise<SourceInfo>{
    const core=this.host.core(),seed=await core.getLiterature(path),pdf=await core.getPDFDocument(path,id);checkAbort(signal);info.sourceHash=pdf.sourceHash;
    const key=createHash('sha256').update(id+'\0'+pdf.sourceHash).digest('hex').slice(0,24),prefix=`translate/source/${key}/`,local=join(this.host.root,'sources',key);
    await mkdir(local,{recursive:true});const pdfPath=join(local,'source.pdf');try{await access(pdfPath);}catch{await writeFile(pdfPath,pdf.pdf);}
    const files=await core.listPackageFiles(path,'translate/');
    let sourcePrefix=prefix;if(!files.some(f=>f.startsWith(prefix)&&f.endsWith('.tex'))){const old=this.host.jobs().find(j=>j.path===path&&j.attachmentId===id&&(!j.sourceHash||j.sourceHash===pdf.sourceHash)&&files.some(f=>f.startsWith(`translate/${j.id}/source-latex/`)&&f.endsWith('.tex')));if(old)sourcePrefix=`translate/${old.id}/source-latex/`;}
    info.hasLatex=files.some(f=>f.startsWith(sourcePrefix)&&f.endsWith('.tex'));if(info.hasLatex)info.prefix=sourcePrefix;
    info.arxivId=detectArxiv(seed)||detectArxiv(seed,await this.host.preview(path,id))||undefined;
    if(!required)try{const report=await this.host.backend.run('pdf_info',{pdf:pdfPath},signal);info.scanned=report.scannedPages.length>0;}catch{checkAbort(signal);}
    if(!info.hasLatex&&automatic&&info.arxivId){
      info.phase='downloading';info.message=`正在获取 arXiv ${info.arxivId} 的源文件…`;this.host.changed();const archiveEntry=prefix+'arxiv-source.tar',archive=join(local,'arxiv-source.tar');
      let bytes=await core.readPackageFile(path,archiveEntry);if(!bytes){bytes=await this.host.download('https://arxiv.org/src/'+info.arxivId,signal);checkAbort(signal);if(new TextDecoder().decode(bytes.subarray(0,5))==='%PDF-')throw Error('arXiv 未提供这篇文献的 LaTeX 源文件。');await core.writeExtensionFiles(path,'translate',{[archiveEntry.slice(10)]:bytes});}await writeFile(archive,bytes);info.archive=archiveEntry;
      let report:{files:string[]};try{report=await this.host.backend.run('unpack_tex',{archive,directory:join(local,'latex')},signal);}catch(error){checkAbort(signal);if(required)throw error;try{await this.host.backend.python('base');}catch{info.phase='ready';info.message='arXiv 源文件已下载；本地环境就绪后可提取。';this.host.changed();return info;}throw Error('无法提取 LaTeX 源文件：'+message(error));}
      const content:Record<string,Uint8Array|string>={};let size=0;for(const file of report.files){const name=artifactPath(file),data=new Uint8Array(await readFile(join(local,'latex',name)));if((size+=data.length)>250*1024*1024)throw Error('LaTeX 源文件超过 250 MB。');content[prefix.slice(10)+name]=data;}checkAbort(signal);await core.writeExtensionFiles(path,'translate',content);info.hasLatex=true;info.prefix=prefix;
    }
    info.phase='ready';info.message=info.hasLatex?'已找到 LaTeX 源文件':info.scanned?'检测到扫描页':info.arxivId?(automatic?'未找到可用的 LaTeX 源文件':'检测到 arXiv 文献，自动下载已关闭'):'未检测到 LaTeX 源文件';this.host.changed();return info;
  }
  async materialize(info:SourceInfo,path:string,directory:string,signal:AbortSignal):Promise<void>{if(!info.prefix)throw Error('没有可用的 LaTeX 源文件。');const core=this.host.core();let size=0;for(const entry of await core.listPackageFiles(path,info.prefix)){const name=artifactPath(entry.slice(info.prefix.length));if(name==='arxiv-source.tar')continue;const data=await core.readPackageFile(path,entry);if(!data)continue;if((size+=data.length)>250*1024*1024)throw Error('LaTeX 源文件超过 250 MB。');checkAbort(signal);const target=join(directory,name);await mkdir(dirname(target),{recursive:true});await writeFile(target,data);}}
  destroy():void{this.reset();}
}
