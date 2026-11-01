import test from 'node:test';
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {installAllDependencies,quickPythonCompatible,insideDirectory,type QuickSetupState,type QuickTexChoice} from '../src/modules/document-translation/quick-setup';
import {defaultDependencies} from '../src/modules/document-translation/dependency-types';
import type {ProgramEntry,InventoryKind} from '../src/modules/document-translation/inventory-types';

function fixture(){
  const root=join(process.cwd(),'test-private-data'),config=defaultDependencies(),entries=new Map<InventoryKind,ProgramEntry[]>(),visible=new Map<InventoryKind,ProgramEntry[]>(),calls:{action:string;kind?:string;value?:string}[]=[],states:QuickSetupState[]=[];let failure='';
  const record=(kind:InventoryKind,path:string,version:string,manager?:string)=>{const entry:ProgramEntry={kind,path,version,manager,directory:kind==='tex'?join(root,'texlive',manager==='portable-full'?'full':'basic'):undefined,id:kind+'-'+version,sources:['一键安装'],runtime:kind==='python'?{ready:true,issues:[],probe:{} as any}:undefined};entries.set(kind,[entry]);return entry;};
  const host={root,config:()=>config,scanPrograms:async(kind:InventoryKind)=>{const list=entries.get(kind)||[];visible.set(kind,[...list]);return list;},releases:async()=>['3.15.2','3.13.13','3.12.10','3.11.9'].map(version=>({version,url:'https://example.test/'+version})),
    installPortable:async(kind:string,release:any)=>{calls.push({action:'install',kind,value:release.version});record('python',join(root,'python',release.version,'python.exe'),release.version);},
    setPythonRuntime:async(path:string)=>{calls.push({action:'select',kind:'python',value:path});config.pythonRuntime=path;},
    ensureDocumentProcessing:async()=>{calls.push({action:'prepare',kind:'base'});return join(root,'internal','python.exe');},
    useSystemTex:async(path:string)=>{calls.push({action:'system',kind:'tex',value:path});if(!path)throw Error('未找到系统 LaTeX');config.tex.method='existing';},checkTex:async()=>'',
    installTex:async()=>{const mode=config.tex.installMethod!;calls.push({action:'install',kind:'tex',value:mode});config.tex.method=mode;record('tex',join(root,'texlive',mode==='portable-full'?'full':'basic','bin','xelatex.exe'),'TeX Live',mode);},
    portableTexReady:async()=>true,prepareTex:async(language:string)=>{calls.push({action:'language',kind:'tex',value:language});},
    installOxide:async()=>{calls.push({action:'install',kind:'latexml'});record('latexml',join(root,'latexml-oxide','version','latexml_oxide.exe'),'0.7.6','oxide');},checkLatexml:async()=>'',
    selectProgram:async(kind:InventoryKind,id:string)=>{calls.push({action:'select',kind,value:id});},checkProgram:async()=>'',
    installProgram:async(kind:'babeldoc'|'pdfmath')=>{calls.push({action:'install',kind});if(failure===kind)throw Error('download interrupted');assert.equal(config.programs[kind].installMethod,'venv');assert.equal(config.programs[kind].python,config.pythonRuntime);record(kind,join(root,'venvs',kind,kind+'.exe'),kind==='babeldoc'?'0.6.4':'1.9.12','venv');},
  };
  return {host:host as unknown as Parameters<typeof installAllDependencies>[0],root,config,entries,visible,calls,states,record,fail:(kind:string)=>failure=kind,run:(tex:QuickTexChoice='portable-basic',signal=new AbortController().signal,path='system-compiler')=>installAllDependencies(host as any,{tex,texPath:path,language:'zh-CN'},signal,state=>states.push(state))};
}

test('quick setup chooses Python from the intersection of the locked component requirements',()=>{assert.equal(quickPythonCompatible('3.12.10'),true);for(const version of ['3.9.13','3.10.16','3.11.9','3.13.13','3.14.5','3.15.2'])assert.equal(quickPythonCompatible(version),false,version);});
for(const tex of ['existing','portable-full','portable-basic'] as const)test(`quick setup configures every required component with ${tex} LaTeX, without installing uv or pipx`,async()=>{
  const x=fixture();await x.run(tex);assert.equal(x.states.at(-1)?.phase,'complete');assert.equal(x.states.at(-1)?.step,6);for(const kind of ['python','latexml','babeldoc','pdfmath'] as const)assert.ok(x.visible.get(kind)?.length,kind+' must be visible after installation');if(tex!=='existing')assert.ok(x.visible.get('tex')?.length);assert.ok(x.config.pythonRuntime?.startsWith(join(x.root,'python')));assert.equal(x.calls.find(c=>c.action==='install'&&c.kind==='python')?.value,'3.12.10');
  assert.deepEqual(x.calls.filter(c=>c.action==='install').map(c=>c.kind),['python',...(tex==='existing'?[]:['tex']),'latexml','babeldoc','pdfmath']);assert.ok(x.calls.every(c=>c.kind!=='uv'&&c.kind!=='pipx'));assert.equal(x.calls.filter(c=>c.action==='system').length,tex==='existing'?1:0);
  if(tex!=='existing')assert.equal(x.calls.find(c=>c.action==='install'&&c.kind==='tex')?.value,tex);
});

test('quick setup validates a manually selected system compiler before downloading anything',async()=>{const x=fixture();await assert.rejects(x.run('existing',undefined,''),/未找到系统 LaTeX/);assert.equal(x.calls.filter(c=>c.action==='install').length,0);assert.equal(x.states.at(-1)?.phase,'error');assert.equal(x.states.at(-1)?.kind,'tex');});

test('quick setup reuses checked private components and ignores otherwise usable system Python versions',async()=>{
  const x=fixture();x.record('python',join(process.cwd(),'external','python.exe'),'3.12.10');await x.run();const installs=x.calls.filter(c=>c.action==='install').length;await x.run();assert.equal(x.calls.filter(c=>c.action==='install').length,installs);assert.equal(x.states.at(-1)?.phase,'complete');
});

test('quick setup reports the failed component and retries without downloading completed programs again',async()=>{
  const x=fixture();x.fail('babeldoc');await assert.rejects(x.run(),/download interrupted/);assert.equal(x.states.at(-1)?.label,'BabelDOC');assert.equal(x.states.at(-1)?.phase,'error');assert.equal(x.calls.filter(c=>c.kind==='pdfmath').length,0);x.fail('');await x.run();assert.equal(x.calls.filter(c=>c.action==='install'&&c.kind==='python').length,1);assert.equal(x.calls.filter(c=>c.action==='install'&&c.kind==='latexml').length,1);assert.equal(x.states.at(-1)?.phase,'complete');
});

test('cancelling quick setup prevents later component installations',async()=>{
  const x=fixture(),controller=new AbortController();x.host.installPortable=async()=>{controller.abort();};await assert.rejects(x.run('portable-basic',controller.signal),{name:'AbortError'});assert.equal(x.states.at(-1)?.phase,'cancelled');assert.equal(x.calls.filter(c=>c.kind==='babeldoc'||c.kind==='pdfmath').length,0);
});

test('private path checks reject sibling directories and traversal outside the managed root',()=>{const root=join(process.cwd(),'LocalAppData','ZotSight');assert.equal(insideDirectory(join(root,'python','python.exe'),root),true);for(const path of [root,root+'-other/python.exe',join(root,'..','python.exe')])assert.equal(insideDirectory(path,root),false);});

test('an interrupted portable TeX directory is not mistaken for a completed installation',async()=>{const x=fixture();x.record('tex',join(x.root,'texlive','basic','bin','xelatex.exe'),'TeX Live','portable-basic');x.host.portableTexReady=async()=>false;await x.run();assert.equal(x.calls.filter(c=>c.action==='install'&&c.kind==='tex').length,1);});
