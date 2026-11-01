import {spawn,execFile,type ChildProcess} from 'node:child_process';
import {access} from 'node:fs/promises';
import {join} from 'node:path';
import {checkAbort} from './types';
export type Progress=(message:string,done?:number,total?:number)=>void;
export const executable=(root:string,kind:string)=>join(root,'runtime',kind,process.platform==='win32'?'Scripts':'bin',process.platform==='win32'?'python.exe':'python');
const exists=async(path:string)=>{try{await access(path);return true;}catch{return false;}};
function terminate(child:ChildProcess):void{if(!child.pid)return;if(process.platform==='win32')execFile('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true},()=>{});else try{process.kill(-child.pid,'SIGTERM');}catch{child.kill();}}

export async function command(file:string,args:string[],options:{cwd:string;signal:AbortSignal;input?:unknown;progress?:Progress;json?:boolean;timeout?:number;env?:NodeJS.ProcessEnv}):Promise<any>{
  checkAbort(options.signal);if(/\.(bat|cmd)$/i.test(file))throw Error('请使用可执行文件路径，例如 python.exe 或 uv.exe。');
  return await new Promise((resolve,reject)=>{
    const child=spawn(file,args,{cwd:options.cwd,windowsHide:true,detached:process.platform!=='win32',stdio:['pipe','pipe','pipe'],env:{...process.env,PYTHONUTF8:'1',PYTHONIOENCODING:'utf-8',UV_LINK_MODE:'copy',...options.env}});
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
