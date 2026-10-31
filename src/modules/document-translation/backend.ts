import {spawn,execFile,type ChildProcess} from 'node:child_process';
import {access,readFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {createServer,type Server} from 'node:http';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import type {TranslationEngine} from './engine';
import {checkAbort,message,type RuntimeSettings,type TranslationUnit} from './types';
import {restore} from './protection';

export type Progress=(message:string,done?:number,total?:number)=>void;
const executable=(root:string,kind:string)=>join(root,'runtime',kind,process.platform==='win32'?'Scripts':'bin',process.platform==='win32'?'python.exe':'python');
const exists=async(path:string)=>{try{await access(path);return true;}catch{return false;}};
function terminate(child:ChildProcess):void{if(!child.pid)return;if(process.platform==='win32')execFile('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true},()=>{});else try{process.kill(-child.pid,'SIGTERM');}catch{child.kill();}}

export async function command(file:string,args:string[],options:{cwd:string;signal:AbortSignal;input?:unknown;progress?:Progress;json?:boolean;timeout?:number}):Promise<any>{
  checkAbort(options.signal);if(/\.(bat|cmd)$/i.test(file))throw Error('请使用可执行文件路径，例如 python.exe 或 uv.exe。');
  return await new Promise((resolve,reject)=>{
    const child=spawn(file,args,{cwd:options.cwd,windowsHide:true,detached:process.platform!=='win32',stdio:['pipe','pipe','pipe'],env:{...process.env,PYTHONUTF8:'1',PYTHONIOENCODING:'utf-8',UV_LINK_MODE:'copy'}});
    let buffer='',tail='',result:any,error:string|undefined,settled=false;
    const cleanup=()=>{clearTimeout(timer);options.signal.removeEventListener('abort',abort);};
    const finish=(failure?:Error)=>{if(settled)return;settled=true;cleanup();failure?reject(failure):resolve(result??{text:tail});};
    const abort=()=>{terminate(child);finish(new DOMException('已取消文档翻译','AbortError'));};
    const timer=setTimeout(()=>{terminate(child);finish(Error('本地文档处理超时，请查看任务日志。'));},options.timeout||1800000);
    options.signal.addEventListener('abort',abort,{once:true});
    child.on('error',e=>finish(Error(`无法启动 ${file}：${e.message}`)));
    const consume=(line:string)=>{if(!options.json){if(line.trim())options.progress?.(line.trim().slice(-220));return;}try{const event=JSON.parse(line);if(event.type==='progress')options.progress?.(event.data.message||'正在处理文档…',event.data.done,event.data.total);else if(event.type==='result')result=event.data;else if(event.type==='error')error=event.data.message;}catch{}};
    child.stdout.setEncoding('utf8');child.stdout.on('data',(data:string)=>{tail=(tail+data).slice(-18000);buffer+=data;let i;while((i=buffer.indexOf('\n'))>=0){consume(buffer.slice(0,i));buffer=buffer.slice(i+1);}});
    child.stderr.setEncoding('utf8');child.stderr.on('data',(data:string)=>{tail=(tail+data).slice(-18000);if(!options.json)options.progress?.(data.trim().slice(-220));});
    child.on('close',code=>{if(buffer)consume(buffer);if(code||error)finish(Error(error||`本地程序退出（${code}）：${tail.slice(-1800)}`));else finish();});
    child.stdin.on('error',()=>{});child.stdin.end(options.input===undefined?'':JSON.stringify(options.input));if(options.signal.aborted)abort();
  });
}

export class Backend {
  constructor(readonly root:string,private settings:()=>RuntimeSettings,private legacyRoot?:string){}
  async python(kind:'base'|'babeldoc'|'pdfmath'):Promise<string>{const config=this.settings();const custom=kind==='base'?config.basePython:kind==='babeldoc'?config.babelPython:config.pdfmathPython;let path=custom||executable(this.root,kind);if(!custom&&!await exists(path)&&this.legacyRoot&&await exists(executable(this.legacyRoot,kind)))path=executable(this.legacyRoot,kind);if(!(await exists(path))&&!custom)throw Error(`尚未安装${kind==='base'?'文档提取':kind==='babeldoc'?' BabelDOC':' PDFMathTranslate'}运行环境，请在 ZotSight 的文档翻译设置中安装。`);return path;}
  async run(action:string,input:unknown,signal:AbortSignal,progress:Progress=()=>{}):Promise<any>{const kind=action==='babeldoc'?'babeldoc':action==='pdfmath'?'pdfmath':'base';return command(await this.python(kind),['-u',join(this.root,'backend','runner.py'),action],{cwd:this.root,signal,input,progress,json:true});}
  async check(signal:AbortSignal):Promise<Record<string,any>>{const report:Record<string,any>={};for(const kind of ['base','babeldoc','pdfmath'] as const){try{report[kind]=await command(await this.python(kind),['-u',join(this.root,'backend','runner.py'),'doctor'],{cwd:this.root,signal,input:this.settings(),json:true,timeout:90000});}catch(error){checkAbort(signal);report[kind]={error:message(error)};}}return report;}
  async setup(signal:AbortSignal,progress:Progress):Promise<void>{
    const uv=this.settings().uv||'uv';await mkdir(join(this.root,'runtime'),{recursive:true});
    const requirements:Record<string,string[]>={base:['-r',join(this.root,'backend','requirements-base.lock')],babeldoc:['-r',join(this.root,'backend','requirements-babeldoc.lock')],pdfmath:['-r',join(this.root,'backend','requirements-pdfmath.lock')]};
    for(const [kind,packages] of Object.entries(requirements)){checkAbort(signal);progress(`正在安装 ${kind} 本地环境…`);if(!(await exists(executable(this.root,kind))))await command(uv,['venv','--python','3.12',join(this.root,'runtime',kind)],{cwd:this.root,signal,progress,timeout:900000});await command(uv,['pip','install','--python',executable(this.root,kind),...packages],{cwd:this.root,signal,progress,timeout:1800000});}progress('本地文档处理环境已安装。');
  }
}

export async function translationBridge(engine:TranslationEngine,signal:AbortSignal,onText?:(text:string)=>void,nativeUnits:TranslationUnit[]=[],onTranslation?:(result:{source:string;text:string})=>void):Promise<{url:string;token:string;close:()=>Promise<void>}>{
  const token=randomBytes(32).toString('hex');const sockets=new Set<any>();
  const normalized=(text:string)=>text.normalize('NFKC').replace(/\s+/g,' ').trim();const native=new Map(nativeUnits.map(unit=>[normalized(restore(unit,unit.text)),unit]));
  const server=createServer(async(request,response)=>{
    const supplied=Buffer.from((request.headers.authorization||'').replace(/^Bearer /,'')),expected=Buffer.from(token);
    const answer=(status:number,value:unknown)=>{if(response.destroyed)return;response.writeHead(status,{'Content-Type':'application/json'});response.end(JSON.stringify(value));};
    if(request.method!=='POST'||request.url!=='/translate'||supplied.length!==expected.length||!timingSafeEqual(supplied,expected)){answer(403,{error:'拒绝访问'});return;}
    let body='';try{for await(const chunk of request){body+=chunk;if(Buffer.byteLength(body)>1024*1024)throw Error('排版段落过大。');}checkAbort(signal);const data=JSON.parse(body);if(typeof data.text!=='string')throw Error('翻译段落格式无效。');onText?.(data.text);const unit=native.get(normalized(data.text));let text:string;if(unit){const result=await engine.translateUnit(unit);text=restore(result.unit,result.text);}else text=await engine.translateText(data.text);onTranslation?.({source:data.text,text});answer(200,{text});}catch(error){answer(500,{error:message(error)});}
  });
  server.on('connection',socket=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket));});
  await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>{server.off('error',reject);resolve();});});
  const close=async()=>{for(const socket of sockets)socket.destroy();await new Promise<void>(resolve=>server.close(()=>resolve()));};const abort=()=>{void close();};signal.addEventListener('abort',abort,{once:true});const address=server.address();if(!address||typeof address==='string')throw Error('无法创建本地翻译桥接。');
  return {url:`http://127.0.0.1:${address.port}`,token,close:async()=>{signal.removeEventListener('abort',abort);await close();}};
}
