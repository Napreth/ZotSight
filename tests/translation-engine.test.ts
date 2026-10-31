import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {defaults,type Transport,type Profile,type TranslationUnit} from '../src/modules/document-translation/types';
import {TranslationEngine,TranslationCache,splitProtectedText} from '../src/modules/document-translation/engine';
import {protectText,validateTranslation,restore,documentUnits} from '../src/modules/document-translation/protection';
import {validArxivId,detectArxiv} from '../src/modules/document-translation/arxiv';

const response=(json:unknown,status=200)=>({status,headers:{},json,text:JSON.stringify(json)});
const profile:Profile={...defaults.profiles[0],id:'test',maxChars:120};
const settings={concurrency:2,interval:0,timeout:500,retries:0};
const context={source:'en',target:'zh-CN',title:'Test',glossary:'',prompt:''};
async function setup(http:Transport,overrides={},signal=new AbortController().signal){const dir=await mkdtemp(join(tmpdir(),'zst-test-'));const cache=new TranslationCache(join(dir,'cache.json'));const engine=new TranslationEngine(profile,{key:'test-secret',secret:''},{...settings,...overrides},context,http,cache,signal);return {engine,dir,cache};}

test('backend math markers, references and glossary survive translation without altering tokens',async()=>{
 const unit=protectText('See <b0> and {v1}, <style id="2">term</style> and $x^2$.');
 assert.equal(unit.protected.length,5);assert.equal(restore(unit,validateTranslation(unit,unit.text)), 'See <b0> and {v1}, <style id="2">term</style> and $x^2$.');
 assert.throws(()=>validateTranslation(unit,unit.text.replace('⟦ZS0⟧','')),/占位符/);
 const strict={...unit,preserveOrder:true};assert.throws(()=>validateTranslation(strict,unit.text.replace('⟦ZS0⟧','X').replace('⟦ZS1⟧','⟦ZS0⟧').replace('X','⟦ZS1⟧')),/顺序/);
 const env=await setup(async r=>response([[[new URL(r.url).searchParams.get('q')]]]));
 try{const custom=new TranslationEngine(profile,{key:'',secret:''},settings,{...context,glossary:'See=见\nZS=标记'},async r=>response([[[new URL(r.url).searchParams.get('q')]]]),env.cache,new AbortController().signal);assert.equal(await custom.translateText('See {v0}.'),'见 {v0}.');}finally{await rm(env.dir,{recursive:true,force:true});}
});

test('text splitting never cuts an immutable marker and reconstructs all input characters',()=>{
 const value='A sentence with ⟦ZS0⟧. '.repeat(100);const chunks=splitProtectedText(value,65);assert.equal(chunks.join(''),value);assert.ok(chunks.every(v=>v.length<=65&&!/⟦[^⟧]*$/.test(v)));
});

test('native SDT extraction skips equations and excluded headers while preserving citation identity',()=>{
 const structure={content:[{type:'paragraph',content:[{text:'A result '},{text:'[1]',refs:[[3]],style:{}},{text:' is useful.'}]},{type:'math',content:[]},{type:'paragraph',flowClass:'excluded',content:[{text:'Header'}]}]} as any;
 const [unit]=documentUnits(structure);assert.equal(documentUnits(structure).length,1);assert.equal(unit.text,'A result ⟦ZS0⟧ is useful.');assert.equal(unit.protected[0].sourceIndex,1);
});

test('completed pieces are cached without credentials and resume without another request',async()=>{
 let calls=0;const env=await setup(async r=>{calls++;return response([[[new URL(r.url).searchParams.get('q')]]]);});
 try{assert.equal(await env.engine.translateText('A paragraph.'),'A paragraph.');assert.equal(await env.engine.translateText('A paragraph.'),'A paragraph.');assert.equal(calls,1);const saved=await readFile(join(env.dir,'cache.json'),'utf8');assert.ok(!saved.includes('test-secret'));const reloaded=new TranslationEngine(profile,{key:'',secret:''},settings,context,async()=>{throw Error('Unexpected network');},new TranslationCache(join(env.dir,'cache.json')),new AbortController().signal);assert.equal(await reloaded.translateText('A paragraph.'),'A paragraph.');}finally{await rm(env.dir,{recursive:true,force:true});}
});

test('concurrency is bounded and identical in-flight requests are shared',async()=>{
 let active=0,maximum=0,calls=0;const env=await setup(async r=>{calls++;maximum=Math.max(maximum,++active);await new Promise(resolve=>setTimeout(resolve,15));active--;return response([[[new URL(r.url).searchParams.get('q')]]]);});
 try{await env.engine.translateUnits(Array.from({length:10},(_,i)=>({id:String(i),text:i<3?'same':String(i),protected:[]})));assert.ok(maximum<=2);assert.equal(calls,8);}finally{await rm(env.dir,{recursive:true,force:true});}
});

test('cancellation aborts transport and prevents completion cache writes',async()=>{
 const controller=new AbortController();let started!:()=>void;const ready=new Promise<void>(r=>started=r);const env=await setup(async r=>new Promise((_resolve,reject)=>{started();r.signal!.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true});}),{},controller.signal);
 try{const work=env.engine.translateText('Pending paragraph.');await ready;controller.abort();await assert.rejects(work,{name:'AbortError'});await assert.rejects(readFile(join(env.dir,'cache.json')),{code:'ENOENT'});}finally{await rm(env.dir,{recursive:true,force:true});}
});

test('non-retryable authorization errors are reported once and redact secrets',async()=>{
 let calls=0;const env=await setup(async()=>{calls++;return response({error:{message:'bad test-secret'}},401)},{retries:2});try{await assert.rejects(env.engine.translateText('Text.'),e=>e instanceof Error&&!e.message.includes('test-secret')&&e.message.includes('已隐藏'));assert.equal(calls,1);}finally{await rm(env.dir,{recursive:true,force:true});}
});

test('arXiv identity accepts published URL forms',()=>{
 assert.equal(validArxivId('https://arxiv.org/pdf/2407.07791v2.pdf'),'2407.07791v2');assert.equal(validArxivId('https://evil.test/2407.07791'),null);assert.equal(detectArxiv({metadata:{doi:'10.48550/arXiv.2407.07791',fields:[]}} as any),'2407.07791');assert.equal(validArxivId('hep-th/9901001'),'hep-th/9901001');
});


test('Latin glossary terms match whole words and preserve adjacent protected markers',async()=>{
 const env=await setup(async r=>response([[[new URL(r.url).searchParams.get('q')]]]));
 try{const engine=new TranslationEngine(profile,{key:'',secret:''},settings,{...context,glossary:'cat=猫'},async r=>response([[[new URL(r.url).searchParams.get('q')]]]),env.cache,new AbortController().signal);assert.equal(await engine.translateText('A cat studies classification with {v0}.'),'A 猫 studies classification with {v0}.');}finally{await rm(env.dir,{recursive:true,force:true});}
});
