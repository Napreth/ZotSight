import {isAbsolute,relative,resolve,join} from 'node:path';
import type {DependencyManager} from './dependency-manager';
import type {DependencyConfig,DependencyKind} from './dependency-types';
import {programSpecs} from './dependency-types';
import {supportedPythonVersion} from './python-runtime';
import {checkAbort,message} from './types';

export type QuickTexChoice='existing'|'portable-full'|'portable-basic';
export interface QuickSetupOptions {tex:QuickTexChoice;texPath?:string;language:string}
export interface QuickSetupState {phase:'installing'|'complete'|'error'|'cancelled';step:number;total:number;label:string;message:string;kind?:DependencyKind}
export const quickSetupSteps=6;
export function insideDirectory(path:string,directory:string):boolean{const part=relative(resolve(directory),resolve(path));return !!part&&part!=='..'&&!part.startsWith('..'+(process.platform==='win32'?'\\':'/'))&&!isAbsolute(part);}
export function quickPythonCompatible(version:string):boolean{
  const match=/^3\.(\d+)\.\d+$/.exec(version);if(!match||!supportedPythonVersion(version))return false;
  // Both validated locks contain NumPy 2.5.4 and SciPy 1.18.1 (Python >=3.12).
  const minor=Number(match[1]);return minor>=12&&Object.values(programSpecs).every(spec=>minor>=spec.pythonMin&&minor<spec.pythonMax);
}
type SetupHost=Pick<DependencyManager,'root'|'config'|'scanPrograms'|'installPortable'|'releases'|'setPythonRuntime'|'ensureDocumentProcessing'|'useSystemTex'|'checkTex'|'installTex'|'prepareTex'|'portableTexReady'|'selectProgram'|'checkLatexml'|'installOxide'|'checkProgram'|'installProgram'>;
export async function installAllDependencies(host:SetupHost,options:QuickSetupOptions,signal:AbortSignal,update:(state:QuickSetupState)=>void):Promise<void>{
  if(!['existing','portable-full','portable-basic'].includes(options.tex))throw Error('请选择 LaTeX 安装方式。');
  let state:QuickSetupState={phase:'installing',step:0,total:quickSetupSteps,label:'准备安装',message:''};
  const stage=async(kind:DependencyKind,label:string,run:(report:(text:string)=>void)=>Promise<void>)=>{checkAbort(signal);state={...state,step:state.step+1,kind,label,message:'',phase:'installing'};update({...state});await run(text=>{state.message=text;update({...state});});checkAbort(signal);};
  try{
    if(options.tex==='existing'){state={...state,kind:'tex',label:'检查系统 LaTeX'};update({...state});await host.useSystemTex(options.texPath||'',signal);}
    let python='';
    await stage('python','Python',async report=>{
      const owned=(await host.scanPrograms('python')).find(entry=>insideDirectory(entry.path,join(host.root,'python'))&&entry.runtime?.ready&&quickPythonCompatible(entry.version));
      if(owned)python=owned.path;
      else{report('正在查询兼容的 Python 便携版…');const release=(await host.releases('python',signal)).filter(r=>quickPythonCompatible(r.version)).sort((a,b)=>b.version.localeCompare(a.version,undefined,{numeric:true}))[0];if(!release)throw Error('未找到符合全部组件要求的 Python 便携版。');await host.installPortable('python',release,signal,report);checkAbort(signal);const entry=(await host.scanPrograms('python')).find(e=>e.version===release.version&&e.runtime?.ready&&insideDirectory(e.path,join(host.root,'python')));if(!entry)throw Error('Python 已下载，但 pip 或 venv 检查未通过。');python=entry.path;}
      checkAbort(signal);await host.setPythonRuntime(python);
    });
    await stage('base','文档处理组件',async report=>{await host.ensureDocumentProcessing(signal,report);});
    await stage('tex',options.tex==='portable-full'?'LaTeX（完整版）':options.tex==='portable-basic'?'LaTeX（精简版）':'系统 LaTeX',async report=>{
      if(options.tex==='existing'){await host.checkTex(signal);return;}
      const entries=await host.scanPrograms('tex'),owned=entries.find(e=>!e.error&&e.manager===options.tex&&insideDirectory(e.path,host.root));let ready=false;
      if(owned&&await host.portableTexReady(options.tex))try{await host.selectProgram('tex',owned.id);await host.checkTex(signal);ready=true;}catch(error){checkAbort(signal);}
      if(!ready){host.config().tex.installMethod=options.tex;await host.installTex(signal,report);}
      await host.prepareTex(options.language,signal,report);await host.scanPrograms('tex');
    });
    await stage('latexml','LaTeXML',async report=>{
      const owned=(await host.scanPrograms('latexml')).find(e=>!e.error&&insideDirectory(e.path,join(host.root,'latexml-oxide')));let ready=false;
      if(owned)try{await host.selectProgram('latexml',owned.id);await host.checkLatexml(signal);ready=true;}catch(error){checkAbort(signal);}
      if(!ready){await host.installOxide(signal,report);await host.scanPrograms('latexml');}
    });
    for(const kind of ['babeldoc','pdfmath'] as const)await stage(kind,programSpecs[kind].name,async report=>{
      const config=host.config().programs[kind],before={method:config.method,executable:config.executable,environmentPython:config.environmentPython};
      const owned=(await host.scanPrograms(kind)).find(e=>!e.error&&insideDirectory(e.path,join(host.root,'venvs',kind))&&e.version===(kind==='babeldoc'?'0.6.4':'1.9.12'));let ready=false;
      if(owned)try{await host.selectProgram(kind,owned.id);await host.checkProgram(kind,signal);ready=true;}catch(error){checkAbort(signal);Object.assign(config,before);}
      Object.assign(config,{installMethod:'venv',python,pythonExplicit:true,installVersion:'validated'} satisfies Partial<DependencyConfig['programs'][typeof kind]>);
      if(!ready){await host.installProgram(kind,signal,report);await host.scanPrograms(kind);}
    });
    state={...state,phase:'complete',label:'安装完成',message:''};update({...state});
  }catch(error){state={...state,phase:signal.aborted?'cancelled':'error',message:signal.aborted?'':message(error)};update({...state});throw error;}
}
