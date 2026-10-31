import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {dirname} from 'node:path';
import {translateBatch,llmProtocols,ProviderError} from './providers';
import {protectText,validateTranslation,restore} from './protection';
import {checkAbort,type Profile,type Secrets,type Settings,type Transport,type EngineContext,type TranslationUnit} from './types';

export const hash=(text:string|Uint8Array)=>createHash('sha256').update(text).digest('hex');
export function splitProtectedText(text:string,limit:number):string[]{
  const parts:string[]=[];let offset=0;
  while(offset<text.length){let end=Math.min(text.length,offset+limit);if(end<text.length){if(/[\uD800-\uDBFF]/.test(text[end-1])&&/[\uDC00-\uDFFF]/.test(text[end]))end--;const open=text.lastIndexOf('⟦',end-1),close=text.lastIndexOf('⟧',end-1);if(open>close)end=open;const minimum=offset+Math.floor(limit*.45);let boundary=-1;for(let i=end-1;i>=minimum;i--)if(/[\s。！？.!?;]/u.test(text[i])){boundary=i+1;break;}if(boundary>offset)end=boundary;}
    if(end<=offset)throw Error('单个受保护内容超过翻译服务的长度限制。');parts.push(text.slice(offset,end));offset=end;
  }return parts;
}
function terms(unit:TranslationUnit,glossary:string):TranslationUnit{
  let text=unit.text;const protectedParts=unit.protected.slice();for(const line of glossary.split('\n')){const i=line.indexOf('=');if(i<1)continue;const source=line.slice(0,i).trim(),target=line.slice(i+1).trim();if(!source||!target)continue;const escaped=source.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');text=text.split(/(⟦ZS\d+⟧)/g).map(piece=>/^⟦ZS\d+⟧$/.test(piece)?piece:piece.replace(new RegExp((/^[A-Za-z0-9]/.test(source)?'(?<![\\p{L}\\p{N}_])':'')+escaped+(/[A-Za-z0-9]$/.test(source)?'(?![\\p{L}\\p{N}_])':''),'gu'),()=>{const token=`⟦ZS${protectedParts.length}⟧`;protectedParts.push({token,text:target});return token;})).join('');}return {...unit,text,protected:protectedParts};
}
export class TranslationCache {
  private values=new Map<string,string>();private loading?:Promise<void>;private writes=Promise.resolve();
  constructor(private path:string){}
  async load():Promise<void>{this.loading ||= (async()=>{try{const data=JSON.parse(await readFile(this.path,'utf8'));if(data.schemaVersion===1)for(const [key,value] of Object.entries(data.entries||{}))if(typeof value==='string')this.values.set(key,value);}catch{}})();await this.loading;}
  get(key:string):string|undefined{return this.values.get(key);}
  async setMany(values:[string,string][]):Promise<void>{for(const [key,value] of values)this.values.set(key,value);const snapshot=JSON.stringify({schemaVersion:1,entries:Object.fromEntries(this.values)});this.writes=this.writes.catch(()=>{}).then(async()=>{await mkdir(dirname(this.path),{recursive:true});const temp=this.path+'.tmp';await writeFile(temp,snapshot,{mode:0o600});await rename(temp,this.path);});await this.writes;}
}
export class TranslationEngine {
  private nextRequest=0;private active=0;private waiting:(()=>void)[]=[];private pending=new Map<string,Promise<string>>();
  readonly fingerprint:string;
  constructor(readonly profile:Profile,private secrets:Secrets,private settings:Pick<Settings,'timeout'|'interval'|'concurrency'|'retries'>,private context:EngineContext,private transport:Transport,private cache:TranslationCache,private signal:AbortSignal){this.fingerprint=hash(JSON.stringify({protocol:profile.protocol,endpoint:profile.endpoint,model:profile.model,apiVersion:profile.apiVersion,source:context.source,target:context.target,glossary:context.glossary,prompt:context.prompt}));}
  private async slot():Promise<()=>void>{checkAbort(this.signal);if(this.active>=Math.max(1,this.settings.concurrency))await new Promise<void>(resolve=>this.waiting.push(resolve));else this.active++;return()=>{const next=this.waiting.shift();if(next)next();else this.active--;};}
  private async pause(milliseconds:number):Promise<void>{if(milliseconds<=0)return;await new Promise<void>((resolve,reject)=>{const abort=()=>{clearTimeout(timer);this.signal.removeEventListener('abort',abort);reject(new DOMException('已取消翻译','AbortError'));};const timer=setTimeout(()=>{this.signal.removeEventListener('abort',abort);resolve();},milliseconds);this.signal.addEventListener('abort',abort,{once:true});if(this.signal.aborted)abort();});}
  private async call(texts:string[]):Promise<string[]>{
    const release=await this.slot();try{checkAbort(this.signal);const delay=Math.max(0,this.nextRequest-Date.now());this.nextRequest=Math.max(Date.now(),this.nextRequest)+this.settings.interval;await this.pause(delay);
      const controller=new AbortController(),abort=()=>controller.abort();this.signal.addEventListener('abort',abort,{once:true});const timeout=setTimeout(()=>controller.abort(new Error('翻译请求超时')),this.settings.timeout);
      try{return await translateBatch(this.profile,this.secrets,texts,this.context,this.transport,controller.signal);}catch(e){if(this.signal.aborted)checkAbort(this.signal);if(controller.signal.aborted)throw new ProviderError('翻译请求超时，请检查服务连接或延长超时设置。',408);throw e;}finally{clearTimeout(timeout);this.signal.removeEventListener('abort',abort);}
    }finally{release();}
  }
  private async translatePiece(unit:TranslationUnit):Promise<string>{
    await this.cache.load();checkAbort(this.signal);const key=hash(this.fingerprint+'\0'+unit.text);const cached=this.cache.get(key);if(cached!==undefined)return validateTranslation(unit,cached);const pending=this.pending.get(key);if(pending)return pending;
    const work=(async()=>{for(let attempt=0;;attempt++){try{const response=await this.call([unit.text]);if(response.length!==1||typeof response[0]!=='string')throw new ProviderError('翻译服务返回的段落数量不匹配。');const value=validateTranslation(unit,response[0]);checkAbort(this.signal);await this.cache.setMany([[key,value]]);return value;}catch(e){checkAbort(this.signal);if(e instanceof ProviderError&&[400,401,403,404].includes(e.status))throw e;if(attempt>=this.settings.retries)throw e;await this.pause(e instanceof ProviderError&&e.retryAfter?Math.min(60000,e.retryAfter*1000):Math.min(10000,1000*2**attempt));}}})();this.pending.set(key,work);try{return await work;}finally{this.pending.delete(key);}
  }
  async translateUnit(input:TranslationUnit):Promise<{unit:TranslationUnit;text:string}>{
    const unit=terms(input,this.context.glossary);const limit=Math.max(100,Math.min(this.profile.maxChars||3000,this.profile.protocol==='google-web'?750:['baidu','tencent','youdao'].includes(this.profile.protocol)?1500:llmProtocols.has(this.profile.protocol)?6000:10000));
    const pieces=splitProtectedText(unit.text,limit);const output=[];for(const piece of pieces){const protectedParts=unit.protected.filter(p=>piece.includes(p.token));output.push(await this.translatePiece({...unit,text:piece,protected:protectedParts}));}return {unit,text:output.join(pieces.length>1?' ':'')};
  }
  async translateUnits(units:TranslationUnit[],onDone?:(unit:TranslationUnit,text:string,done:number)=>void):Promise<{unit:TranslationUnit;text:string}[]>{
    const results=new Array<{unit:TranslationUnit;text:string}>(units.length);let index=0,done=0;let failed:unknown;
    await Promise.all(Array.from({length:Math.min(Math.max(1,this.settings.concurrency),units.length)},async()=>{while(!failed){const current=index++;if(current>=units.length)return;try{checkAbort(this.signal);const result=await this.translateUnit(units[current]);results[current]=result;onDone?.(result.unit,result.text,++done);}catch(error){failed=error;}}}));if(failed)throw failed;checkAbort(this.signal);return results;
  }
  async translateText(text:string):Promise<string>{if(!text.trim())return text;const unit=protectText(text);const result=await this.translateUnit(unit);return restore(result.unit,result.text);}
}
