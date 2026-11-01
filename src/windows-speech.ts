import {spawn,type ChildProcessWithoutNullStreams} from 'node:child_process';
import {join} from 'node:path';

export interface WindowsVoice {id:string;name:string;language:string;languageName?:string;default:boolean}
interface Pending {resolve:(value:any)=>void;reject:(error:Error)=>void;cleanup:()=>void}
export class WindowsSpeechClient {
  private child?:ChildProcessWithoutNullStreams;private nextId=0;private pending=new Map<number,Pending>();
  constructor(private pluginRoot:string){}
  private start():ChildProcessWithoutNullStreams {
    if(this.child)return this.child;
    const executable=join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
    const child=this.child=spawn(executable,['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',join(this.pluginRoot,'modules','read-aloud','windows.ps1')],{windowsHide:true,stdio:['pipe','pipe','pipe']});
    let buffer='',errors='';child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
    child.stdout.on('data',(chunk:string)=>{buffer+=chunk;if(buffer.length>48*1024*1024){this.fail(child,Error('本地语音音频过大。'));return;}let index;while((index=buffer.indexOf('\n'))!==-1){const line=buffer.slice(0,index).trim();buffer=buffer.slice(index+1);try{const message=JSON.parse(line),request=this.pending.get(message.id);if(!request)continue;this.pending.delete(message.id);request.cleanup();message.error?request.reject(Error(message.error)):request.resolve(message.result);}catch{this.fail(child,Error('Windows 语音服务返回了无效结果。'));return;}}});
    child.stderr.on('data',(chunk:string)=>errors=(errors+chunk).slice(-3000));
    child.on('error',error=>this.fail(child,Error('无法启动 Windows 语音服务：'+error.message)));
    child.on('close',()=>this.fail(child,Error('Windows 语音服务已退出。'+errors.trim())));child.stdin.on('error',error=>this.fail(child,error));
    return child;
  }
  private fail(child:ChildProcessWithoutNullStreams,error:Error):void{if(this.child!==child)return;this.child=undefined;child.kill();for(const request of this.pending.values()){request.cleanup();request.reject(error);}this.pending.clear();}
  private request(action:string,data:Record<string,unknown>,signal:AbortSignal):Promise<any>{
    if(signal.aborted)return Promise.reject(new DOMException('已停止朗读','AbortError'));
    const child=this.start(),id=++this.nextId;
    return new Promise((resolve,reject)=>{
      const abort=()=>{if(this.pending.has(id))this.fail(child,new DOMException('已停止朗读','AbortError'));};
      const timer=setTimeout(()=>this.fail(child,Error('Windows 语音服务响应超时。')),60000),cleanup=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);};
      this.pending.set(id,{resolve,reject,cleanup});signal.addEventListener('abort',abort,{once:true});
      child.stdin.write(JSON.stringify({id,action,...data})+'\n');if(signal.aborted)abort();
    });
  }
  async voices(signal:AbortSignal):Promise<WindowsVoice[]>{const result=await this.request('voices',{},signal);if(!Array.isArray(result?.voices))throw Error('无法读取 Windows 系统声音。');return result.voices.filter((v:any)=>typeof v.id==='string'&&typeof v.name==='string'&&typeof v.language==='string');}
  async synthesize(voiceId:string,text:string,signal:AbortSignal):Promise<Uint8Array>{
    const result=await this.request('synthesize',{voiceId,text},signal);if(typeof result?.audio!=='string')throw Error('Windows 没有生成朗读音频。');
    const bytes=Buffer.from(result.audio,'base64');if(bytes.length<44||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WAVE')throw Error('Windows 返回的朗读音频无效。');return new Uint8Array(bytes);
  }
  close():void{if(this.child)this.fail(this.child,new DOMException('已停止朗读','AbortError'));}
}
