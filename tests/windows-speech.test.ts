import test from 'node:test';
import assert from 'node:assert/strict';
import {WindowsSpeechClient} from '../src/windows-speech';
import {WindowsReadAloudVoice,type SpeechAudioHost} from '../src/windows-read-aloud';
import type {ReadAloudSegment} from '../vendor/zotero-reader/common/types';

const segments=[{text:'First sentence.',anchor:'sentence',position:{start:[0],end:[1]}},{text:'Second sentence.',anchor:'sentence',position:{start:[1],end:[2]}}] as unknown as ReadAloudSegment[];
const info={id:'system-voice',name:'Microsoft test voice',language:'en-US',default:true};
const settle=()=>new Promise(resolve=>setTimeout(resolve,5));
function audioFixture(){
 const audios:any[]=[],released:any[]=[];
 const host:SpeechAudioHost={create:()=>{const audio:any={paused:true,currentTime:0,duration:1,playbackRate:1,plays:0,play:async()=>{audio.paused=false;audio.plays++;audio.onplaying?.(new Event('playing'));},pause:()=>audio.paused=true,removeAttribute:()=>{},load:()=>{}};audios.push(audio);return {audio,release:()=>released.push(audio)};}};
 return {host,audios,released};
}
test('Windows speech playback pauses, resumes, changes speed and skips with the Zotero segment controller',async()=>{
 const calls:string[]=[],audio=audioFixture(),client={synthesize:async(_voice:string,text:string)=>{calls.push(text);return new Uint8Array([1]);}} as unknown as WindowsSpeechClient,voice=new WindowsReadAloudVoice(client,info,audio.host),controller=voice.controllerAt(segments,0),active:string[]=[];let complete=0;
 controller.addEventListener('ActiveSegmentChange',event=>{const segment=(event as any).segment;if(segment)active.push(segment.text);});controller.addEventListener('Complete',()=>complete++);
 try{
  controller.speed=1.25;controller.paused=false;await settle();assert.deepEqual(active,['First sentence.']);assert.equal(controller.buffering,false);assert.equal(audio.audios[0].playbackRate,1.25);
  controller.paused=true;assert.equal(audio.audios[0].paused,true);controller.paused=false;await settle();assert.equal(audio.audios[0].plays,2);assert.equal(calls.length,1);controller.speed=1.5;assert.equal(audio.audios[0].playbackRate,1.5);
  controller.skipAhead('sentence');await settle();assert.deepEqual(calls,['First sentence.','Second sentence.']);assert.equal(audio.released.length,1);assert.equal(active.at(-1),'Second sentence.');audio.audios[1].onended(new Event('ended'));assert.equal(complete,1);assert.equal(audio.released.length,2);
 }finally{controller.destroy();}
});
test('late Windows synthesis cannot play audio after stop or document closure',async()=>{
 let finish!:(bytes:Uint8Array)=>void,signal!:AbortSignal;const audio=audioFixture(),client={synthesize:(_voice:string,_text:string,abort:AbortSignal)=>{signal=abort;return new Promise<Uint8Array>(resolve=>finish=resolve);}} as unknown as WindowsSpeechClient,voice=new WindowsReadAloudVoice(client,info,audio.host),controller=voice.controllerAt(segments,0);
 controller.paused=false;controller.destroy();assert.equal(signal.aborted,true);finish(new Uint8Array([1]));await settle();assert.equal(audio.audios.length,0);
});
test('Windows synthesis errors leave playback stopped and expose the actual failure',async()=>{
 const audio=audioFixture(),client={synthesize:async()=>{throw Error('voice removed');}} as unknown as WindowsSpeechClient,voice=new WindowsReadAloudVoice(client,info,audio.host),controller=voice.controllerAt(segments,0);let detail='';controller.addEventListener('Error',event=>detail=(event as any).message);
 try{controller.paused=false;await settle();assert.equal(detail,'voice removed');assert.equal(controller.paused,true);assert.equal(controller.buffering,false);assert.equal(audio.audios.length,0);}finally{controller.destroy();}
});
test('Windows bridge enumerates installed voices and synthesizes local WAV audio without a browser speech service',{skip:process.platform!=='win32'},async()=>{
 const client=new WindowsSpeechClient(process.cwd()),signal=new AbortController().signal;
 try{const voices=await client.voices(signal);assert.ok(voices.every(voice=>voice.id&&voice.name&&voice.language&&voice.languageName));const abort=new AbortController(),pending=client.voices(abort.signal);abort.abort();await assert.rejects(pending,{name:'AbortError'});assert.equal((await client.voices(signal)).length,voices.length);if(!voices.length)return;await assert.rejects(client.synthesize('missing-voice','test',signal),/unavailable/);const bytes=await client.synthesize(voices[0].id,'Local speech test. $() "quoted" text.',signal),wav=Buffer.from(bytes);assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.toString('ascii',8,12),'WAVE');assert.ok(wav.length>1000);}finally{client.close();}
});
