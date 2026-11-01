import {translateOutline,restoreOutline} from './outline';
import type {OutlineTranslation} from '../../outline';
import type {App} from 'obsidian';
import {mkdir,readFile,writeFile,readdir,access} from 'node:fs/promises';
import {join,resolve,sep,relative} from 'node:path';
import {zipSync} from 'fflate';
import {safeFilename} from './paths';
import {ArtifactWorkspace} from './artifacts';
import {Backend,translationBridge} from './backend';
import {TranslationEngine,TranslationCache} from './engine';
import {documentUnits,parts,restore} from './protection';
import {detectArxiv} from './arxiv';
import {checkAbort,message,ROUTES,storedRoute,type Job,type Settings,type Secrets,type Transport,type ZotSightAPI,type ReadingTranslation,type ReadingDocument,type TranslationUnit,type Route} from './types';

export interface PipelineHost {app:App;root:string;settings:Settings;core:()=>ZotSightAPI;secrets:(id:string)=>Secrets;transport:Transport;download:(url:string,signal:AbortSignal)=>Promise<Uint8Array>;changed:(job:Job)=>void;register:(translation:ReadingTranslation)=>void;prepareLatex?:(job:Job,directory:string,signal:AbortSignal)=>Promise<void>}
export class Pipeline {
  constructor(private host:PipelineHost,private backend:Backend){}
  private status(job:Job,message:string,done?:number,total?:number):void{job.message=message;if(done!==undefined)job.done=done;if(total!==undefined)job.total=total;job.updatedAt=new Date().toISOString();this.host.changed(job);}
  directory(job:Job):string{if(!/^[a-f0-9-]{16,64}$/i.test(job.id))throw Error('翻译任务标识无效。');return join(this.host.root,'jobs',job.id);}
  private workspace(job:Job):ArtifactWorkspace{return new ArtifactWorkspace(()=>this.host.core(),this.directory(job),job);}
  async checkpoint(job:Job):Promise<void>{await this.workspace(job).checkpoint();}
  private async publish(job:Job,local:string,title:string,kind:'pdf'|'tex',outline?:OutlineTranslation[]):Promise<void>{
    const root=resolve(this.directory(job)),path=resolve(local);if(!path.startsWith(root+sep))throw Error('排版结果超出了任务目录。');const data=await readFile(path);if(kind==='pdf'&&!data.subarray(0,5).equals(Buffer.from('%PDF-')))throw Error('排版结果不是有效的 PDF。');
    const name=`${safeFilename(title)}.${kind==='pdf'?'pdf':'zip'}`,entry=`translate/${job.id}/${kind==='pdf'?'pdf/':''}${name}`;
    await this.host.core().writeExtensionFiles(job.path,'translate',{[entry.slice('translate/'.length)]:new Uint8Array(data)});
    if(kind==='pdf')await this.host.core().registerPackagePDF(job.path,entry,name,undefined,outline);
    job.outputs=job.outputs.filter(o=>o.path!==entry);job.outputs.push({path:entry,title:name,kind});this.host.changed(job);
  }
  private async sourceZip(directory:string,destination:string):Promise<void>{const archive:Record<string,Uint8Array>={};const root=resolve(directory);let size=0;const walk=async(dir:string)=>{for(const entry of await readdir(dir,{withFileTypes:true})){if(entry.name.startsWith('.'))continue;const path=join(dir,entry.name);if(entry.isDirectory())await walk(path);else if(/^(?:LICENSE|LICENCE|COPYING|NOTICE)(?:[._-]|$)/i.test(entry.name)||/\.(tex|sty|cls|bib|bst|bbl|pdf|png|jpe?g|eps|bbx|cbx|def|cfg|clo|fd|otf|ttf|txt|md)$/i.test(entry.name)){const data=await readFile(path);size+=data.byteLength;if(size>250*1024*1024)throw Error('译文源码包过大。');archive[relative(root,path).replaceAll('\\','/')]=new Uint8Array(data);}}};await walk(root);await writeFile(destination,zipSync(archive,{level:6}));}
  async run(job:Job,signal:AbortSignal):Promise<void>{
    if(job.route==='template')throw Error('这项实验任务已移至 ZSTranslate，当前插件不能继续执行。');
    const route=job.route==='pdf'?(job.resolvedRoute==='arxiv'?'arxiv':'layout'):job.route;
    if(route==='babeldoc'||route==='pdfmath'){job.layoutEngine=route==='babeldoc'?'babeldoc':'pdfmath';return this.runRoute(job,signal,'layout');}
    return this.runRoute(job,signal,route);
  }

  private async document(job:Job,signal:AbortSignal,strict:boolean):Promise<ReadingDocument>{try{return await this.host.core().getReadingDocument(job.path,job.attachmentId,{signal,onProgress:m=>this.status(job,m)});}catch(error){checkAbort(signal);if(strict)throw error;const source=await this.host.core().getPDFDocument(job.path,job.attachmentId);return {...source,structure:{schemaVersion:'1.2.0',metadata:{processor:{type:'pdf',version:14},dateCreated:new Date().toISOString(),source:{contentType:'application/pdf',hash:source.sourceHash,fileSize:source.pdf.length}},catalog:{outline:[],pages:[]},content:[]}};}}
  private async runRoute(job:Job,signal:AbortSignal,route:Route):Promise<void>{
    job.phase='preparing';job.done=0;job.total=0;this.status(job,'读取文档…');
    const core=this.host.core(),settings=structuredClone(this.host.settings),profile=settings.profiles.find(p=>p.id===job.profileId);if(!profile)throw Error('任务使用的翻译服务已被删除。');job.profileName=profile.name;const dir=this.directory(job);await mkdir(dir,{recursive:true});await this.workspace(job).hydrate();
    if(route!=='reading'&&route!=='layout'){await this.backend.dependencies.ensureDocumentProcessing(signal,m=>this.status(job,m));{await this.backend.dependencies.prepareTex(job.targetLanguage,signal,m=>this.status(job,m));const report=await this.backend.run('doctor',settings.runtime,signal);if(job.targetLanguage.startsWith('zh')&&!report.xelatex)throw Error('中文 LaTeX 编译需要 XeLaTeX。请安装 TeX Live / MiKTeX，或在设置中指定 xelatex 路径。');if(!report.xelatex&&!report.pdflatex)throw Error('没有找到 LaTeX 编译器，请检查本地排版环境。');}}
    const seed=await core.getLiterature(job.path);const doc=await this.document(job,signal,route==='reading');checkAbort(signal);if(job.sourceHash&&job.sourceHash!==doc.sourceHash)throw Error('原 PDF 已改变，请重新创建翻译任务。');job.sourceHash=doc.sourceHash;job.attachmentId=doc.attachmentId;
    await writeFile(join(dir,'source.pdf'),doc.pdf);await writeFile(join(dir,'source.sdt.json'),JSON.stringify(doc.structure));
    const pdfUnits=documentUnits(doc.structure);await writeFile(join(dir,'source.txt'),pdfUnits.map(u=>restore(u,u.text)).join('\n\n'));await this.checkpoint(job);
    const context={source:job.sourceLanguage,target:job.targetLanguage,title:seed.metadata.title,glossary:settings.glossary,prompt:settings.prompt};
    const engine=new TranslationEngine(profile,this.host.secrets(profile.id),settings,context,this.host.transport,new TranslationCache(join(dir,'translation-cache.json')),signal);
    const progress=(m:string,done?:number,total?:number)=>this.status(job,m,done,total);let units:TranslationUnit[]=[];
    if(route==='arxiv'){
      job.phase='source';this.status(job,'准备 LaTeX 源文件…',0,0);const sourceDirectory=join(dir,'latex-source');
      let archive:string|undefined;
      if(this.host.prepareLatex)await this.host.prepareLatex(job,sourceDirectory,signal);
      else{const selected=job.arxivId||detectArxiv(seed,JSON.stringify(doc.structure.content));if(!selected)throw Error('没有找到 LaTeX 源文件或 arXiv 标识。');const valid=detectArxiv(seed,'',selected)!;archive=join(dir,'arxiv-source.tar');try{await access(archive);}catch{await writeFile(archive,await this.host.download(`https://arxiv.org/src/${valid}`,signal));}}
      const source=await this.backend.run('extract_tex',{archive,main:job.latexMain||'',directory:sourceDirectory,project:join(dir,'project.json'),runtime:settings.runtime},signal,progress);units=source.units;await writeFile(join(dir,'tex-units.json'),JSON.stringify(units));await writeFile(join(dir,'tex.txt'),units.map(u=>restore(u,u.text)).join('\n\n'));await this.saveOriginalLatex(job);await this.checkpoint(job);this.status(job,`已提取 ${units.length} 个 LaTeX 段落（${source.extractor}）`,0,units.length);
    }else if(route!=='layout')units=documentUnits(doc.structure);
    if(route==='reading'||route==='arxiv'){
      if(!units.length)throw Error('没有提取到可翻译的文字。扫描件请使用 PDFMathTranslate 翻译。');job.phase='translating';this.status(job,'正在翻译文档…',0,units.length);
      const results=await engine.translateUnits(units,(_,__,done)=>this.status(job,`正在翻译文档 ${done} / ${units.length}`,done,units.length));checkAbort(signal);
      await writeFile(join(dir,'translated-units.json'),JSON.stringify(results));await writeFile(join(dir,'translated.txt'),results.map(r=>restore(r.unit,r.text)).join('\n\n'));
      if(route==='reading'){
        const translation:ReadingTranslation={id:'zstranslate:'+job.id,path:job.path,attachmentId:doc.attachmentId,sourceHash:doc.sourceHash,title:`${job.targetLanguage} · ${profile.name}`,targetLanguage:job.targetLanguage,outline:await this.navigation(job,doc,engine,results.map(r=>({ref:r.unit.ref!,parts:parts(r.unit,r.text)}))),units:results.map(r=>({ref:r.unit.ref!,parts:parts(r.unit,r.text)}))};
        await writeFile(join(dir,'reading-translation.json'),JSON.stringify(translation));await this.host.core().writeExtensionFiles(job.path,'translate',{[`${job.id}/reading-translation.json`]:JSON.stringify(translation)});this.host.register(translation);job.outputs=job.outputs.filter(o=>o.kind!=='translation');job.outputs.push({path:`translate/${job.id}/reading-translation.json`,title:translation.title,kind:'translation'});
        const active=core.getActiveLiterature();if(active?.path===job.path&&active.seed.reader.attachmentId===job.attachmentId)await core.showReadingTranslation(job.path,translation.id);
      }else{
        const values=results.map(r=>{const original=units.find(u=>u.id===r.unit.id)!;const latexText=r.text.replace(/⟦ZS\d+⟧/g,token=>original.protected.some(p=>p.token===token)?token:r.unit.protected.find(p=>p.token===token)?.text||token);return {id:r.unit.id,ref:r.unit.ref,text:route==='arxiv'?latexText:restore(r.unit,r.text)};});await writeFile(join(dir,'translated-units.json'),JSON.stringify(values));job.phase='compiling';this.status(job,'正在构建译文 PDF…',0,0);
        const output=await this.backend.run('render_tex',{project:join(dir,'project.json'),translations:join(dir,'translated-units.json'),directory:join(dir,'latex-source'),target:job.targetLanguage,runtime:settings.runtime},signal,progress);
        checkAbort(signal);job.phase='publishing';const outline=await this.navigation(job,doc,engine);await this.publish(job,output.pdf,`${ROUTES[route]}-${job.targetLanguage}`,'pdf',outline);const sourceDirectory=join(dir,'latex-source');const zip=join(dir,'translated-latex.zip');await this.sourceZip(sourceDirectory,zip);await this.publish(job,zip,`LaTeX 源码-${job.targetLanguage}`,'tex');
      }
    }else{
      job.phase='layout';this.status(job,'识别 PDF 版面…',0,0);let info:{scannedPages:number[]}={scannedPages:[]};try{info=await this.backend.run('pdf_info',{pdf:join(dir,'source.pdf')},signal,progress);}catch{checkAbort(signal);}const backend=job.layoutEngine==='auto'?(info.scannedPages.length?'pdfmath':'babeldoc'):job.layoutEngine;
      if(backend==='babeldoc'&&info.scannedPages.length)throw Error('检测到扫描页；请选择 PDFMathTranslate，以使用 OCR。');this.status(job,`${backend==='babeldoc'?'BabelDOC':'PDFMathTranslate'}：开始排版${info.scannedPages.length?'，扫描页将进行 OCR':''}…`);
      await mkdir(join(dir,'layout-output'),{recursive:true});let chunks=0;const layoutTexts:{source:string;text:string}[]=[];const bridge=await translationBridge(engine,signal,()=>this.status(job,`正在翻译并排版（已请求 ${++chunks} 个段落）`,chunks,0),documentUnits(doc.structure),result=>{layoutTexts.push(result);});try{const output=await this.backend.run(backend,{pdf:join(dir,'source.pdf'),directory:join(dir,'layout-output'),source:job.sourceLanguage==='auto'?'en':job.sourceLanguage,target:job.targetLanguage,bridge:{url:bridge.url,token:bridge.token},concurrency:settings.concurrency},signal,progress);bridge.assertHealthy();const outline=await this.navigation(job,doc,engine);for(const file of output.files){checkAbort(signal);await this.publish(job,file.path,`${file.title}-${job.targetLanguage}`,'pdf',outline);}}finally{await bridge.close();await writeFile(join(dir,'layout-translations.json'),JSON.stringify(layoutTexts));await writeFile(join(dir,'translated.txt'),layoutTexts.map(r=>r.text).join('\n\n'));}
    }
    checkAbort(signal);job.phase='complete';this.status(job,job.route==='pdf'?`文档翻译完成（${route==='arxiv'?'arXiv 源码编译':'PDF 版面翻译'}）。`:'文档翻译完成。',job.total||job.done,job.total);await new ArtifactWorkspace(()=>this.host.core(),dir,{...job,state:'complete'}).checkpoint();
  }
  private async navigation(job:Job,doc:ReadingDocument,engine:TranslationEngine,units:ReadingTranslation['units']=[]):Promise<OutlineTranslation[]>{if(doc.structure.catalog.outline.length)this.status(job,'正在翻译目录…',0,0);return translateOutline(doc.structure,engine,units);}
  private async saveOriginalLatex(job:Job):Promise<void>{const source=join(this.directory(job),'latex-source');const files:Record<string,Uint8Array>={};const walk=async(dir:string)=>{for(const e of await readdir(dir,{withFileTypes:true})){if(e.isSymbolicLink())continue;const path=join(dir,e.name);if(e.isDirectory())await walk(path);else files[`${job.id}/source-latex/${relative(source,path).replaceAll('\\','/')}`]=new Uint8Array(await readFile(path));}};await walk(source);await this.host.core().writeExtensionFiles(job.path,'translate',files);}
  async migrateLegacy(job:Job):Promise<void>{
    const core=this.host.core();if(!job.path.endsWith('.zslp')||(await core.listPackageFiles(job.path,`translate/${job.id}/`)).includes(`translate/${job.id}/job.json`))return;
    for(const output of job.outputs||[]){if(output.path.startsWith('translate/')||output.kind==='translation')continue;const file=this.host.app.vault.getFileByPath(output.path);if(!file)continue;
      const entry=`translate/${job.id}/${output.kind==='pdf'?'pdf/':''}${file.name}`,bytes=new Uint8Array(await this.host.app.vault.readBinary(file));
      await core.writeExtensionFiles(job.path,'translate',{[entry.slice('translate/'.length)]:bytes});if(output.kind==='pdf')await core.registerPackagePDF(job.path,entry,output.title,output.path);output.path=entry;
    }
    await this.checkpoint(job);
  }
  async discover(path:string):Promise<Job[]>{const core=this.host.core(),result:Job[]=[];for(const entry of await core.listPackageFiles(path,'translate/'))if(/^translate\/[a-f0-9-]{16,64}\/job\.json$/i.test(entry)){try{const bytes=await core.readPackageFile(path,entry);if(!bytes)continue;const job=JSON.parse(new TextDecoder().decode(bytes)) as Job;if(!storedRoute(job.route)||job.id!==entry.split('/')[1]||!Array.isArray(job.outputs))continue;job.path=path;if(['running','queued'].includes(job.state)){job.state='cancelled';job.message='上次任务未完成，可继续翻译。';}result.push(job);}catch{}}return result;}
  async restore(job:Job):Promise<void>{if(job.route!=='reading'||job.state!=='complete'||!job.outputs.some(o=>o.kind==='translation'))return;try{const core=this.host.core(),entry=`translate/${job.id}/reading-translation.json`;let bytes=await core.readPackageFile(job.path,entry);if(!bytes){bytes=new Uint8Array(await readFile(join(this.directory(job),'reading-translation.json')));await core.writeExtensionFiles(job.path,'translate',{[`${job.id}/reading-translation.json`]:bytes});}const translation=JSON.parse(new TextDecoder().decode(bytes)) as ReadingTranslation;translation.path=job.path;if(!translation.outline){const saved=await core.readPackageFile(job.path,`translate/${job.id}/source.sdt.json`);if(saved){translation.outline=restoreOutline(JSON.parse(new TextDecoder().decode(saved)),translation.units);await core.writeExtensionFiles(job.path,'translate',{[`${job.id}/reading-translation.json`]:JSON.stringify(translation)});}}this.host.register(translation);}catch{}}
}
