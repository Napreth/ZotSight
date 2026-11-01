import {ReadAloudController} from '../vendor/zotero-reader/common/read-aloud/controller';
import {ReadAloudVoice} from '../vendor/zotero-reader/common/read-aloud/voice';
import type {ReadAloudSegment} from '../vendor/zotero-reader/common/types';
import {WindowsSpeechClient,type WindowsVoice} from './windows-speech';

export interface SpeechAudioHost {create:(bytes:Uint8Array)=>{audio:HTMLAudioElement;release:()=>void}}
export function speechAudioHost(win:Window):SpeechAudioHost{const context=win as Window&typeof globalThis;return {create:bytes=>{const url=context.URL.createObjectURL(new context.Blob([bytes.buffer as ArrayBuffer],{type:'audio/wav'})),audio=new context.Audio(url);return {audio,release:()=>context.URL.revokeObjectURL(url)};}};}

export class WindowsReadAloudVoice extends ReadAloudVoice {
  declare readonly impl:WindowsVoice;
  constructor(readonly client:WindowsSpeechClient,voice:WindowsVoice,private audioHost:SpeechAudioHost){super({standardCreditsRemaining:null,premiumCreditsRemaining:null,getVoices:async()=>[]},voice);}
  get id(){return 'windows-'+this.impl.id;}
  get label(){return this.impl.name;}
  get language(){return this.impl.language;}
  get score(){return this.impl.default?5:1;}
  get segmentGranularity(){return 'sentence' as const;}
  get creditsPerMinute(){return null;}
  get tier(){return 'local' as const;}
  get default(){return this.impl.default;}
  get sentenceDelay(){return 0;}
  getController(segments:ReadAloudSegment[],backward:number|null,forward:number|null){return new WindowsReadAloudController(this,segments,backward,forward,this.audioHost);}
  getSampleController(segments:ReadAloudSegment[]){return this.getController(segments,null,null);}
  controllerAt(segments:ReadAloudSegment[],start:number){return new WindowsReadAloudController(this,segments,null,null,this.audioHost,start);}
}

export class WindowsReadAloudController extends ReadAloudController {
  declare readonly voice:WindowsReadAloudVoice;
  private current?:{audio:HTMLAudioElement;release:()=>void};private synthesis?:AbortController;private generation=0;
  constructor(voice:WindowsReadAloudVoice,segments:ReadAloudSegment[],backward:number|null,forward:number|null,private audioHost:SpeechAudioHost,start=backward??0){super(voice,segments,backward,forward);this._position=start;this._paused=true;}
  protected get _segmentProgressFraction(){const audio=this.current?.audio;return audio&&audio.duration?audio.currentTime/audio.duration:0;}
  protected get _segmentProgressSeconds(){return this.current?.audio.currentTime||0;}
  protected _onSpeedChange():void{if(this.current)this.current.audio.playbackRate=this._speed;}
  protected _speak():void{
    if(this._destroyed)return;
    if(this._paused){if(this.current)this.current.audio.pause();else this._stop();return;}
    if(this.current){const current=this.current;void current.audio.play().catch(error=>{if(this.current===current&&!this._paused&&!this._destroyed)this.failed(error);});return;}
    void this.render();
  }
  private async render():Promise<void>{
    this._stop();const generation=this.generation,index=this._position,segment=this._segments[index];if(!segment)return;
    const abort=this.synthesis=new AbortController();this.buffering=true;
    try{
      const bytes=await this.voice.client.synthesize(this.voice.impl.id,segment.text,abort.signal);
      if(abort.signal.aborted||generation!==this.generation||this._destroyed||this._paused)return;
      const current=this.current=this.audioHost.create(bytes),audio=current.audio;audio.playbackRate=this._speed;
      audio.onplaying=()=>{if(this.current!==current)return;this.buffering=false;this._handleSegmentStart(segment,index);};
      audio.onended=()=>{if(this.current!==current)return;this._stop();this._handleSegmentEnd(segment,index);};
      audio.onerror=()=>{if(this.current===current)this.failed(Error('无法播放系统生成的语音音频。'));};
      await audio.play();
    }catch(error){if(!abort.signal.aborted&&generation===this.generation&&!this._destroyed)this.failed(error);}
  }
  private failed(error:unknown):void{this._paused=true;this._error='unknown';this._stop();this.dispatchEvent(Object.assign(new Event('Error'),{message:error instanceof Error?error.message:String(error)}));}
  protected _stop():void{
    this.generation++;this.synthesis?.abort();this.synthesis=undefined;
    const current=this.current;this.current=undefined;if(current){current.audio.onended=null;current.audio.onplaying=null;current.audio.onerror=null;current.audio.pause();current.audio.removeAttribute('src');current.audio.load();current.release();}this.buffering=false;
  }
  destroy():void{super.destroy();this._stop();}
}
