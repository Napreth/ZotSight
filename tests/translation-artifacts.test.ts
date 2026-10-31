import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {ArtifactWorkspace,artifactPath} from '../src/modules/document-translation/artifacts';
import {availableRoutes,type Job} from '../src/modules/document-translation/types';

test('document translation exposes four independent routes',()=>assert.deepEqual(availableRoutes,['reading','arxiv','babeldoc','pdfmath']));
test('package artifacts are portable without the original local workspace',async()=>{
  const root=await mkdtemp(join(tmpdir(),'zstranslate-package-'));const files=new Map<string,Uint8Array>();const core={writeExtensionFiles:async(_:string,ns:string,values:Record<string,Uint8Array|string>)=>{for(const [path,data] of Object.entries(values))files.set(ns+'/'+path,typeof data==='string'?new TextEncoder().encode(data):data);},listPackageFiles:async(_:string,prefix:string)=>[...files.keys()].filter(k=>k.startsWith(prefix)),readPackageFile:async(_:string,name:string)=>files.get(name)||null} as any;
  const job={id:'12345678-1234-4321-4321-123456789abc',path:'Paper.zslp',outputs:[]} as unknown as Job;
  try{const a=new ArtifactWorkspace(()=>core,join(root,'first'),job);await mkdir(join(a.directory,'latex-source'),{recursive:true});await writeFile(join(a.directory,'source.txt'),'Original text');await writeFile(join(a.directory,'latex-source','main.tex'),'\\documentclass{article}');await writeFile(join(a.directory,'translation-cache.json'),'{"cached":true}');await writeFile(join(a.directory,'secrets.txt'),'must not publish');await mkdir(join(a.directory,'layout-output','work'),{recursive:true});await writeFile(join(a.directory,'layout-output','work','temporary.pdf'),'intermediate');await writeFile(join(a.directory,'source.pdf'),'original already in core attachments');await a.checkpoint();
    assert.ok(files.has(`translate/${job.id}/job.json`));assert.ok(!files.has(`translate/${job.id}/secrets.txt`));assert.ok(!files.has(`translate/${job.id}/layout-output/work/temporary.pdf`));assert.ok(!files.has(`translate/${job.id}/source.pdf`));const b=new ArtifactWorkspace(()=>core,join(root,'second'),job);await b.hydrate();assert.equal(await readFile(join(b.directory,'source.txt'),'utf8'),'Original text');assert.equal(await readFile(join(b.directory,'latex-source','main.tex'),'utf8'),'\\documentclass{article}');assert.equal(await readFile(join(b.directory,'translation-cache.json'),'utf8'),'{"cached":true}');
    for(const path of ['../outside','/root','C:/file','a\\b','a//b'])assert.throws(()=>artifactPath(path));
  }finally{await rm(root,{recursive:true,force:true});}
});
