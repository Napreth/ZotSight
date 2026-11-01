import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {DependencyManager} from '../src/modules/document-translation/dependency-manager';
import {defaults} from '../src/modules/document-translation/types';
import {documentPythonRequirements,pythonRuntimeProbeCode,assessPythonRuntime,supportedPythonVersion,parsePythonRuntime,PythonDependencyError,type PythonRuntimeProbe} from '../src/modules/document-translation/python-runtime';

async function fixture(gate?:Promise<void>){
  const dir=await mkdtemp(join(tmpdir(),'zs-processing-')),root=join(dir,'data'),sdk=join(dir,process.platform==='win32'?'sdk/python.exe':'sdk/bin/python'),runtime=structuredClone(defaults.runtime),calls:{file:string;args:string[]}[]=[];
  const probe:PythonRuntimeProbe={version:'3.12.10',major:3,minor:12,implementation:'cpython',releaseLevel:'final',prefix:dirname(sdk),pip:true,venv:true,ensurepip:true,freeThreaded:false};
  await mkdir(dirname(sdk),{recursive:true});await writeFile(sdk,'fixture');await mkdir(join(dir,'backend'));await writeFile(join(dir,'backend/requirements-base.lock'),'pymupdf==1.26.7\npylatexenc==2.11\nlxml==6.0.2\n');
  const installed=new Set<string>();let created=false;
  const manager=new DependencyManager(dir,()=>runtime,()=>{},{root,execute:async(file,args)=>{
    calls.push({file,args});
    if(args.includes(pythonRuntimeProbeCode))return {text:JSON.stringify(probe)};
    if(args[0]==='-m'&&args[1]==='venv'){created=true;if(gate)await gate;const python=join(args[2],process.platform==='win32'?'Scripts/python.exe':'bin/python');await mkdir(dirname(python),{recursive:true});await writeFile(python,'fixture');return {text:''};}
    if(args.includes('install')){installed.add(file);return {text:''};}
    if(args.some(arg=>arg.includes('import pymupdf'))&&!installed.has(file))throw Error('No module named pymupdf');
    return {text:'3.12.10'};
  }});
  manager.config().pythonRuntime=sdk;
  return {dir,root,sdk,manager,runtime,calls,probe,installed,get created(){return created;}};
}

test('runtime version policy follows the pinned packages and does not invent a Python upper bound',async()=>{
  const lock=await readFile('modules/document-translation/backend/requirements-base.lock','utf8');
  assert.deepEqual(lock.trim().split(/\r?\n/).sort(),documentPythonRequirements.map(p=>`${p.distribution}==${p.version}`).sort());
  for(const version of ['3.10.0','3.10.0+local','3.12.10','3.14.5','3.15.2','4.0.0'])assert.equal(supportedPythonVersion(version),true,version);
  for(const version of ['3.9.13','3.8.20','2.7.18','3.10.0rc1','unknown'])assert.equal(supportedPythonVersion(version),false,version);
});

test('runtime checks identify missing pip, venv and venv pip initialization separately',async()=>{
  const x=await fixture();try{
    for(const key of ['pip','venv','ensurepip'] as const){const check=assessPythonRuntime({...x.probe,[key]:false});assert.equal(check.ready,false);assert.match(check.issues.join(' '),new RegExp(key));}
    assert.equal(assessPythonRuntime(x.probe).ready,true);
    const older=assessPythonRuntime({...x.probe,version:'3.9.13',minor:9});assert.match(older.issues.join(' '),/PyMuPDF.*≥3.10/);
  }finally{await rm(x.dir,{recursive:true,force:true});}
});

test('document helper libraries are installed only in a private environment and reused on the next run',async()=>{
  const x=await fixture();try{
    const python=await x.manager.ensureDocumentProcessing(new AbortController().signal);assert.ok(python.startsWith(join(x.root,'internal','documents')));assert.equal(x.runtime.basePython,python);
    const installations=x.calls.filter(call=>call.args.includes('install'));assert.equal(installations.length,1);assert.notEqual(installations[0].file,x.sdk);assert.deepEqual(installations[0].args.slice(0,4),['-m','pip','--isolated','install']);
    assert.ok(!x.calls.some(call=>call.file===x.sdk&&call.args.includes('install')));
    await x.manager.ensureDocumentProcessing(new AbortController().signal);assert.equal(x.calls.filter(call=>call.args.includes('install')).length,1);assert.equal(x.manager.config().inventory?.installed.base,undefined);
  }finally{await rm(x.dir,{recursive:true,force:true});}
});

test('a fully populated SDK is still kept separate from the document helper environment',async()=>{
  const x=await fixture();try{x.installed.add(x.sdk);const python=await x.manager.ensureDocumentProcessing(new AbortController().signal);assert.notEqual(python,x.sdk);assert.ok(x.created);assert.ok(!x.calls.some(call=>call.file===x.sdk&&call.args.includes('install')));}finally{await rm(x.dir,{recursive:true,force:true});}
});

test('background source unpacking uses the selected Python without installing libraries',async()=>{
  const x=await fixture();try{assert.equal(await x.manager.processingPython('unpack_tex',new AbortController().signal),x.sdk);assert.ok(!x.calls.some(call=>call.args.includes('install')||call.args.includes('venv')));}finally{await rm(x.dir,{recursive:true,force:true});}
});

test('an unselected Python never triggers discovery or installation at translation start',async()=>{
  const x=await fixture();try{x.manager.config().pythonRuntime='';x.manager.inventory.scan=async()=>{throw Error('Must not auto-select a runtime');};await assert.rejects(x.manager.ensureDocumentProcessing(new AbortController().signal),PythonDependencyError);assert.equal(x.calls.length,0);}finally{await rm(x.dir,{recursive:true,force:true});}
});

test('runtime selection and translation start recheck capabilities without modifying the SDK',async()=>{
  const x=await fixture();try{
    x.manager.config().pythonRuntime='';x.probe.pip=false;await assert.rejects(x.manager.setPythonRuntime(x.sdk),/缺少 pip/);assert.equal(x.manager.config().pythonRuntime,'');
    x.probe.pip=true;await x.manager.setPythonRuntime(x.sdk);assert.equal(x.manager.config().pythonRuntime,x.sdk);
    x.probe.venv=false;await assert.rejects(x.manager.requirePythonRuntime(new AbortController().signal),/缺少 venv/);assert.equal(x.created,false);assert.ok(x.calls.every(call=>call.args.includes(pythonRuntimeProbeCode)));
  }finally{await rm(x.dir,{recursive:true,force:true});}
});

test('changing the selected SDK or its version selects a different private environment',async()=>{
  const x=await fixture();try{
    const first=await x.manager.ensureDocumentProcessing(new AbortController().signal),other=join(x.dir,process.platform==='win32'?'other/python.exe':'other/bin/python');await mkdir(dirname(other),{recursive:true});await writeFile(other,'fixture');
    await x.manager.setPythonRuntime(other);const second=await x.manager.ensureDocumentProcessing(new AbortController().signal);assert.notEqual(second,first);
    x.probe.version='3.12.11';const third=await x.manager.ensureDocumentProcessing(new AbortController().signal);assert.notEqual(third,second);
    assert.equal(x.calls.filter(call=>call.args.includes('install')).length,3);
  }finally{await rm(x.dir,{recursive:true,force:true});}
});

test('a cancelled waiting job leaves preparation running and the runtime cannot change during preparation',async()=>{
  let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve),x=await fixture(gate);try{
    const first=x.manager.ensureDocumentProcessing(new AbortController().signal),controller=new AbortController(),waiting=x.manager.ensureDocumentProcessing(controller.signal);controller.abort();await assert.rejects(waiting,{name:'AbortError'});assert.equal(x.manager.preparingDocumentProcessing,true);
    await assert.rejects(x.manager.setPythonRuntime(x.sdk),/正在准备/);release();await first;assert.equal(x.calls.filter(call=>call.args.includes('install')).length,1);assert.equal(x.manager.preparingDocumentProcessing,false);
  }finally{release();await rm(x.dir,{recursive:true,force:true});}
});

test('Python probe parsing tolerates SDK warnings interleaved with standard output',async()=>{const x=await fixture();try{assert.deepEqual(parsePythonRuntime('SDK warning\n'+JSON.stringify(x.probe)+'\nA warning on stderr'),x.probe);}finally{await rm(x.dir,{recursive:true,force:true});}});
