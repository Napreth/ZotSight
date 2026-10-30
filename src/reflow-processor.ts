import {readFile, mkdir, writeFile, rename, unlink} from 'node:fs/promises';
import {join, resolve, sep} from 'node:path';
import {createHash} from 'node:crypto';
import {inflateRawSync} from 'node:zlib';
// Zotero's SDTPack reader; see THIRD-PARTY-NOTICES.md.
// @ts-ignore JavaScript module supplied by Zotero
import {openStructuredDocumentTextPack} from '../vendor/structured-document-text/src/pack/reader.js';
import type {StructuredDocumentText} from '../vendor/structured-document-text/schema';

export type ReflowLoader=(bytes:Uint8Array,signal:AbortSignal,progress:(message:string)=>void)=>Promise<StructuredDocumentText>;
const abortError=()=>new DOMException('已取消阅读模式处理','AbortError');

export function reflowLoader(pluginDir:string,win:Window):ReflowLoader {
  return async(bytes,signal,progress)=>{
    const hash=createHash('md5').update(bytes).digest('hex');
    const cache=join(pluginDir,'cache',`${hash}-14.sdt`);
    const decode=async(buf:Uint8Array):Promise<StructuredDocumentText>=>{
      const pack=await openStructuredDocumentTextPack(buf,{inflate:(b:Uint8Array)=>inflateRawSync(b)});
      const structure=await pack.materialize();
      if(structure.metadata.source.hash!==hash||structure.metadata.processor.version!==14||structure.schemaVersion!=='1.2.0')throw Error('阅读模式缓存版本不匹配');
      return structure;
    };
    if(signal.aborted)throw abortError();
    try{const cached=await decode(await readFile(cache));if(signal.aborted)throw abortError();return cached;}catch(e){if(signal.aborted)throw abortError();}
    progress('正在分析 PDF 版面…');
    const root=resolve(pluginDir,'vendor','zotero-document-worker');
    const code=await readFile(join(root,'worker.js'),'utf8');
    if(signal.aborted)throw abortError();
    const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));
    const worker=new (win as Window&typeof globalThis).Worker(url);URL.revokeObjectURL(url);
    const packed=await new Promise<Uint8Array>((resolveResult,reject)=>{
      const finish=(error?:Error,value?:Uint8Array)=>{clearTimeout(timer);signal.removeEventListener('abort',cancel);worker.terminate();error?reject(error):resolveResult(value!);};
      const cancel=()=>finish(abortError());
      const timer=setTimeout(()=>finish(Error('版面分析超时，请重试。')),180000);
      signal.addEventListener('abort',cancel,{once:true});
      worker.onerror=event=>finish(Error(event.message||'阅读模式处理器启动失败'));
      worker.onmessage=async({data:message})=>{
        if(message.action==='FetchData'){
          try{
            const name=message.data;
            if(typeof name!=='string'||!/^[\w./-]+$/.test(name)||name.includes('..'))throw Error('无效的处理器资源');
            const path=resolve(root,name);if(!path.startsWith(root+sep))throw Error('处理器资源超出范围');
            const file=await readFile(path);if(signal.aborted)return;
            const buf=Uint8Array.from(file).buffer;worker.postMessage({responseID:message.id,data:buf},[buf]);
          }catch(e){if(!signal.aborted)worker.postMessage({responseID:message.id,error:{message:e instanceof Error?e.message:String(e)}});}
        }else if(message.progressID===1){
          const value=message.data?.progress;
          const percent=typeof value==='number'?Math.round(value):undefined;
          progress(`正在分析 PDF 版面${percent!==undefined?` · ${percent}%`: '…'}`);
        }else if(message.responseID===1){
          if(message.error)finish(Error(message.error.message||'无法分析这份 PDF'));
          else if(message.data?.buf instanceof ArrayBuffer)finish(undefined,new Uint8Array(message.data.buf));
          else finish(Error('阅读模式处理器返回了无效数据'));
        }
      };
      const copy=Uint8Array.from(bytes).buffer;
      worker.postMessage({id:1,action:'getStructuredDocumentText',data:{buf:copy,contentType:'application/pdf',sourceHash:hash,reportProgress:true}},[copy]);
    });
    const structure=await decode(packed);if(signal.aborted)throw abortError();
    // A complete, verified pack is published atomically; interrupted runs leave no cache.
    await mkdir(join(pluginDir,'cache'),{recursive:true});
    const temp=`${cache}.${crypto.randomUUID()}.tmp`;
    try{await writeFile(temp,packed);await rename(temp,cache);}finally{await unlink(temp).catch(()=>{});}
    return structure;
  };
}
