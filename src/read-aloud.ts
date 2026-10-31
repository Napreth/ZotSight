import {setIcon} from 'obsidian';
import {BrowserReadAloudProvider} from '../vendor/zotero-reader/common/read-aloud/browser/provider';
import type {BrowserReadAloudVoice} from '../vendor/zotero-reader/common/read-aloud/browser/voice';
import {BrowserReadAloudController} from '../vendor/zotero-reader/common/read-aloud/browser/controller';
import {buildSDTReadAloudSegments,getSDTLang} from '../vendor/zotero-reader/common/read-aloud/sdt-segments';
import type {ReadAloudSegment} from '../vendor/zotero-reader/common/types';
import type {StructuredDocumentText} from '../vendor/structured-document-text/schema';

export interface SpeechSettings {voiceId?:string;speed?:number}
let active:LocalReadAloud|null=null;
class PositionedLocalController extends BrowserReadAloudController {
  constructor(voice:BrowserReadAloudVoice,segments:ReadAloudSegment[],start:number){super(voice,segments,null,null);this._position=start;}
}
export class LocalReadAloud {
  private popup:HTMLElement;private play:HTMLButtonElement;private voice:HTMLSelectElement;private status:HTMLElement;
  private controller?:BrowserReadAloudController;private voices:BrowserReadAloudVoice[]=[];private segments:ReadAloudSegment[]=[];private structure?:StructuredDocumentText;
  private version=0;private disposed=false;private preparing?:Promise<void>;
  constructor(private root:HTMLElement,private load:(signal:AbortSignal)=>Promise<StructuredDocumentText>,private highlight:(structure:StructuredDocumentText|null,segment:ReadAloudSegment|null)=>void,private settings:SpeechSettings={},private save:(settings:SpeechSettings)=>void=()=>{},private startPage:()=>number=()=>1){
    this.popup=root.createDiv({cls:'zs-read-aloud',attr:{'aria-label':'本地朗读'}});this.popup.hidden=true;const header=this.popup.createDiv('zs-read-aloud-head');header.createEl('strong',{text:'本地朗读'});this.icon(header,'x','关闭朗读',()=>this.close());
    this.voice=this.popup.createEl('select',{attr:{'aria-label':'本地朗读声音'}});this.voice.onchange=()=>{this.stop();this.settings.voiceId=this.voice.value;this.save({...this.settings});};
    const controls=this.popup.createDiv('zs-read-aloud-controls');this.icon(controls,'skip-back','上一句',()=>this.controller?.skipBack('sentence'));this.play=this.icon(controls,'play','开始朗读',()=>void this.toggle());this.icon(controls,'skip-forward','下一句',()=>this.controller?.skipAhead('sentence'));this.icon(controls,'square','停止朗读',()=>this.stop());const speed=controls.createEl('select',{attr:{'aria-label':'朗读速度'}});for(const value of [.75,1,1.25,1.5,1.75,2])speed.createEl('option',{text:value+'×',value:String(value)});speed.value=String(this.settings.speed||1);speed.onchange=()=>{this.settings.speed=Number(speed.value);if(this.controller)this.controller.speed=this.settings.speed;this.save({...this.settings});};this.status=this.popup.createDiv({cls:'zs-read-aloud-status',attr:{role:'status'}});
  }
  private icon(root:HTMLElement,icon:string,label:string,action:()=>void):HTMLButtonElement{const button=root.createEl('button',{cls:'zs-icon-button',attr:{type:'button','aria-label':label,title:label}});setIcon(button,icon);button.onclick=action;return button;}
  async show():Promise<void>{if(!this.popup.hidden){this.close();return;}this.popup.hidden=false;await this.prepare();}
  private abort=new AbortController();
  private prepare():Promise<void>{this.preparing ||= this.loadDocument();return this.preparing;}
  private async loadDocument():Promise<void>{const version=this.version;this.play.disabled=true;this.status.setText('正在准备本地朗读…');try{if(!window.speechSynthesis)throw Error('当前系统未提供本地语音服务。');const [structure,all]=await Promise.all([this.load(this.abort.signal),new BrowserReadAloudProvider().getVoices()]);if(this.disposed||this.abort.signal.aborted||version!==this.version)return;this.structure=structure;this.segments=buildSDTReadAloudSegments(structure,'sentence').segments;this.voices=all.filter(voice=>voice.impl.localService);this.voice.empty();for(const voice of this.voices)this.voice.createEl('option',{value:voice.id,text:voice.label+' · '+voice.language});const lang=getSDTLang(structure);this.voice.value=this.voices.find(v=>v.id===this.settings.voiceId)?.id||this.voices.find(v=>v.language.split('-')[0]===lang)?.id||this.voices[0]?.id||'';this.play.disabled=!this.voices.length||!this.segments.length;this.status.setText(!this.voices.length?'没有可用的本地声音，请先安装系统语音包。':!this.segments.length?'没有可朗读的正文。':'使用本机语音，不上传正文。');}catch(e){if(!this.abort.signal.aborted)this.status.setText(e instanceof Error?e.message:String(e));this.preparing=undefined;}}
  async toggle():Promise<void>{await this.prepare();if(this.disposed||!this.structure||!this.segments.length)return;if(this.controller){this.controller.paused=!this.controller.paused;this.updatePlay();return;}const voice=this.voices.find(v=>v.id===this.voice.value);if(!voice)return;if(active&&active!==this)active.stop();active=this;
    const start=this.segments.findIndex(segment=>{const index=segment.position.start[0],block:any=this.structure!.content[index];return (block?.anchor?.pageRects?.[0]?.[0]??0)+1>=this.startPage();});
    const controller=this.controller=new PositionedLocalController(voice,this.segments,Math.max(0,start));controller.addEventListener('ActiveSegmentChange',event=>{const segment=(event as Event&{segment:ReadAloudSegment|null}).segment;this.highlight(this.structure!,segment);if(segment)this.status.setText(segment.text);this.updatePlay();});controller.addEventListener('Complete',()=>{this.stop();this.status.setText('朗读完成。');});controller.addEventListener('Error',()=>{this.stop();this.status.setText('本地语音播放失败，请尝试其他系统声音。');});controller.speed=this.settings.speed||1;controller.paused=false;this.updatePlay();
  }
  private updatePlay():void{const speaking=!!this.controller&&!this.controller.paused;setIcon(this.play,speaking?'pause':'play');this.play.setAttribute('aria-label',speaking?'暂停朗读':'开始朗读');this.play.title=speaking?'暂停朗读':'开始朗读';}
  stop():void{this.controller?.destroy();this.controller=undefined;if(active===this)active=null;this.highlight(null,null);this.updatePlay();}
  close():void{this.stop();this.popup.hidden=true;}
  destroy():void{this.disposed=true;this.version++;this.abort.abort();this.close();this.popup.remove();}
}
