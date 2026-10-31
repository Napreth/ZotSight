import test from 'node:test';
import assert from 'node:assert/strict';
import {unzipSync,zipSync} from 'fflate';
import {LiteraturePackage,createPackage,packagePath} from '../src/package';
import {newSeed} from '../src/model';
import {PackageStore} from '../src/package-store';

test('a literature package is a standard ZIP with separate Markdown and annotations',()=>{
  const seed=newSeed('中文论文');seed.note='---\nrelated: "[[Paper]]"\n---\n# 笔记\n';
  const bytes=createPackage(seed),entries=unzipSync(bytes);
  assert.equal(new TextDecoder().decode(entries['notes/main.md']),seed.note);
  const manifest=JSON.parse(new TextDecoder().decode(entries['manifest.json']));assert.equal(manifest.note,undefined);assert.equal(manifest.annotations,undefined);
  assert.deepEqual(new LiteraturePackage(zipSync(entries)).seed(),seed);
});
test('note updates preserve unknown plugin files and translated binary attachments',()=>{
  const pkg=new LiteraturePackage(createPackage());const pdf=new Uint8Array([37,80,68,70,45,0,255,128]);
  pkg.set('translate/job/pdf/result.pdf',pdf);pkg.set('future/plugin.json','{"hello":true}');
  const reopened=new LiteraturePackage(pkg.encode()),seed=reopened.seed();seed.note='edited';reopened.setSeed(seed);
  const result=new LiteraturePackage(reopened.encode());assert.deepEqual(result.read('translate/job/pdf/result.pdf'),pdf);assert.equal(result.text('future/plugin.json'),'{"hello":true}');assert.equal(result.seed().note,'edited');
});
test('invalid archives and unsafe member paths cannot become literature packages',()=>{
  for(const path of ['../escape','/absolute','a\\b','a//b','a/./b','C:/file'])assert.throws(()=>packagePath(path));
  assert.throws(()=>new LiteraturePackage(new Uint8Array([1,2,3])));
  assert.throws(()=>new LiteraturePackage(zipSync({'../evil':new Uint8Array([1])})));
  const bytes=createPackage();bytes[40]^=255;assert.throws(()=>new LiteraturePackage(bytes).seed());
});
test('serialized companion writes do not overwrite notes or metadata from another writer',async()=>{
  let bytes=createPackage(newSeed('Original'));const file={extension:'zslp'} as any;
  const vault={readBinary:async()=>bytes.buffer,modifyBinary:async(_:unknown,next:ArrayBuffer)=>{await new Promise(r=>setTimeout(r,5));bytes=new Uint8Array(next);}} as any;
  const store=new PackageStore(vault),base=(await store.read(file)).seed(),note=structuredClone(base);note.note='unsaved editor text';
  await Promise.all([store.update(file,p=>{p.set('translate/job/text.txt','译文');const seed=p.seed();seed.metadata.year='2026';p.setSeed(seed);}),store.save(file,note,base)]);
  const result=await store.read(file);assert.equal(result.seed().note,note.note);assert.equal(result.seed().metadata.year,'2026');assert.equal(result.text('translate/job/text.txt'),'译文');
});
test('unchanged extracted data does not rewrite the archive',async()=>{
  let writes=0;const bytes=createPackage(),file={extension:'zslp'} as any;
  const store=new PackageStore({readBinary:async()=>bytes.buffer,modifyBinary:async()=>{writes++;}} as any);
  await store.update(file,pkg=>pkg.setSeed(pkg.seed()));assert.equal(writes,0);
});
test('legacy migration keeps reads valid across the extension rename',async()=>{
  const seed=newSeed('Legacy');seed.note='keep me';let bytes=new TextEncoder().encode(JSON.stringify(seed));const file={extension:'zsseed'} as any;
  const store=new PackageStore({read:async()=>new TextDecoder().decode(bytes),readBinary:async()=>bytes.buffer,modifyBinary:async(_:unknown,b:ArrayBuffer)=>{bytes=new Uint8Array(b);}} as any);
  await store.migrate(file,async()=>{file.extension='zslp';assert.equal((await store.read(file)).seed().note,seed.note);});
  assert.equal(new LiteraturePackage(bytes).seed().note,seed.note);
});
