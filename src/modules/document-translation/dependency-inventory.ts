import {pythonRuntimeProbeCode,parsePythonRuntime,assessPythonRuntime} from './python-runtime';
import {probeTranslationProgram} from './program-probe';
import {readdir,stat,realpath} from 'node:fs/promises';
import {join,dirname,resolve,basename} from 'node:path';
import {createHash} from 'node:crypto';
import type {DependencyConfig} from './dependency-types';
import type {InventoryKind,ProgramEntry,ProgramRegistration} from './inventory-types';
import {findExecutable,launcherPython} from './dependency-manager';
import {nativePython,rootPython} from './python-discovery';
import type {command} from './process';

interface InventoryHost {
  pathValue?:()=>string;pythonPaths?:()=>Promise<string[]>;root:()=>string;config:()=>DependencyConfig;
  execute:typeof command;changed:()=>void;selected:(kind:InventoryKind)=>Promise<{path:string;python?:string}>;
  programEnvironment?:(path:string)=>Promise<NodeJS.ProcessEnv>;
  scanned?:(kind:InventoryKind)=>void;
  registered:(kind:InventoryKind)=>Promise<ProgramRegistration[]>|ProgramRegistration[];
}
type Candidate=Partial<ProgramEntry>&{path:string;sources:string[]};
const fileExists=async(path:string)=>{try{return (await stat(path)).isFile();}catch{return false;}};
export const utilityProgram=(kind:InventoryKind)=>kind==='python'||kind==='uv'||kind==='pipx';
export async function installationIdentity(kind:InventoryKind,path:string,python?:string):Promise<string>{
  let actual=python&&['babeldoc','pdfmath','pipx'].includes(kind)?await nativePython(python)||python:path;
  try{actual=await realpath(actual);}catch{actual=resolve(actual);}
  if(kind==='tex')actual=dirname(actual);
  return kind+':'+(process.platform==='win32'?actual.toLowerCase():actual);
}
export async function mergePrograms(entries:ProgramEntry[]):Promise<ProgramEntry[]>{
  const records=new Map<string,ProgramEntry>();
  for(const entry of entries){
    const key=await installationIdentity(entry.kind,entry.kind==='python'&&entry.directory?join(entry.directory,'python-'+entry.version):entry.path,entry.python),old=records.get(key);
    if(old){
      old.sources=[...new Set([...old.sources,...entry.sources])];
      old.manualPaths=[...new Set([...(old.manualPaths||[]),...(entry.manualPaths||[])])];
      old.aliases=[...new Set([old.path,entry.path,...(old.aliases||[]),...(entry.aliases||[])])];
      if(entry.manager){old.manager=entry.manager;old.directory=entry.directory;if(!entry.error||old.error)old.path=entry.path;}
      if((!old.version||old.version==='未知'||old.error)&&!entry.error){old.path=entry.path;old.version=entry.version;old.error=undefined;old.runtime=entry.runtime;old.python=entry.python;}
    }else records.set(key,{...entry,aliases:[entry.path,...(entry.aliases||[])],id:createHash('sha256').update(key).digest('hex').slice(0,20)});
  }
  return [...records.values()].sort((a,b)=>b.version.localeCompare(a.version,undefined,{numeric:true})||a.path.localeCompare(b.path));
}
export class ProgramInventory {
  private records=new Map<InventoryKind,ProgramEntry[]>();private pending=new Map<InventoryKind,Promise<ProgramEntry[]>>();private selectedIds=new Map<InventoryKind,string>();revision=0;
  constructor(private host:InventoryHost){}
  list(kind:InventoryKind):ProgramEntry[]{return this.records.get(kind)||[];}
  hasScanned(kind:InventoryKind):boolean{return this.records.has(kind);}
  select(kind:InventoryKind,id:string):void{this.selectedIds.set(kind,id);this.revision++;this.host.changed();}
  scanning(kind:InventoryKind):boolean{return this.pending.has(kind);}
  selected(kind:InventoryKind):string|undefined{return kind==='python'?this.list('python').find(entry=>entry.aliases?.some(path=>process.platform==='win32'?path.toLowerCase()===this.host.config().pythonRuntime?.toLowerCase():path===this.host.config().pythonRuntime))?.id:utilityProgram(kind)?undefined:this.selectedIds.get(kind);}
  private config(){return this.host.config().inventory ||= {manual:{},installed:{}};}
  async add(kind:InventoryKind,path:string):Promise<ProgramEntry>{
    path=path.trim().replace(/^"(.*)"$/,'$1');
    if(kind==='python')path=await nativePython(path);
    if(!path||!await fileExists(path))throw Error('程序路径不存在，请选择实际的可执行文件。');
    const entry=await this.inspect(kind,{path,sources:['手动添加']});if(entry.error)throw Error(entry.error);
    const paths=this.config().manual[kind] ||= [];if(!paths.includes(path))paths.push(path);
    await this.scan(kind);this.host.changed();
    return this.list(kind).find(e=>e.manualPaths?.includes(path))!;
  }
  async remove(kind:InventoryKind,path:string):Promise<void>{const entry=this.list(kind).find(e=>e.path===path),paths=entry?.manualPaths||[path];this.config().manual[kind]=(this.config().manual[kind]||[]).filter(p=>!paths.includes(p));await this.scan(kind);this.host.changed();}
  remember(kind:InventoryKind,registration:ProgramRegistration):void{const installed=this.config().installed[kind] ||= [];const old=installed.find(r=>r.path===registration.path);if(old)Object.assign(old,registration);else installed.push(registration);this.host.changed();}
  async scan(kind:InventoryKind):Promise<ProgramEntry[]>{const pending=this.pending.get(kind);if(pending)return pending;const task=this.performScan(kind).then(entries=>{this.host.scanned?.(kind);return entries;}).finally(()=>{this.pending.delete(kind);this.host.changed();});this.pending.set(kind,task);this.host.changed();return task;}
  private async pathCandidates(names:string[]):Promise<string[]>{const paths:string[]=[];for(const name of names)for(const dir of (this.host.pathValue?.()??process.env.PATH??'').split(process.platform==='win32'?';':':')){const found=await findExecutable(name,dir);if(found&&!/[/\\]microsoft[/\\]windowsapps[/\\]/i.test(found))paths.push(found);}return [...new Set(paths)];}
  private async systemPythons():Promise<string[]>{
    const paths=await this.pathCandidates(['python','python3','python3.10','python3.11','python3.12','python3.13','python3.14','python3.15']),signal=new AbortController().signal,options={cwd:this.host.root(),signal,timeout:15000};
    const uv=await findExecutable('uv');if(uv)try{const result=await this.host.execute(uv,['python','list','--only-installed','--output-format','json'],options);for(const item of JSON.parse(String(result.text)))if(typeof item.path==='string')paths.push(item.path);}catch{}
    if(process.platform==='win32'){
      const py=await findExecutable('py');if(py&&!/windowsapps/i.test(py))try{const text=String((await this.host.execute(py,['-0p'],options)).text);for(const line of text.split(/\r?\n/)){const match=line.match(/([A-Za-z]:[\\/].*?python(?:\d[^\\/]*)?\.exe)\s*$/i);if(match)paths.push(match[1]);}}catch{}
      for(const key of ['HKCU\\Software\\Python','HKLM\\Software\\Python','HKLM\\Software\\WOW6432Node\\Python'])try{const text=String((await this.host.execute('reg.exe',['query',key,'/s'],options)).text);for(const line of text.split(/\r?\n/)){const match=line.match(/REG_(?:SZ|EXPAND_SZ)\s+([A-Za-z]:\\.*)$/);if(match)paths.push(/\.(?:exe|bat|cmd)$/i.test(match[1])?match[1]:join(match[1],'python.exe'));}}catch{}
    }
    const roots=new Set<string>();if(process.env.PYENV_ROOT)roots.add(process.env.PYENV_ROOT);
    for(const dir of (this.host.pathValue?.()??process.env.PATH??'').split(process.platform==='win32'?';':':'))if(basename(dir).toLowerCase()==='shims')roots.add(dirname(dir));
    for(const root of roots)try{for(const folder of await readdir(join(root,'versions')))paths.push(join(root,'versions',folder,process.platform==='win32'?'python.exe':'bin/python'));}catch{}
    const native=await Promise.all([...new Set(paths)].map(nativePython));return [...new Set(native.filter(Boolean))];
  }
  private async pipxCandidates():Promise<Candidate[]>{
    await this.scan('python');
    const versions=this.list('python').filter(e=>!e.error),roots=new Map<string,{python:string;version:string}>(),signal=new AbortController().signal;
    for(const entry of versions)try{const python=await rootPython(entry.path,this.host.execute,this.host.root(),signal),key=process.platform==='win32'?python.toLowerCase():python;roots.set(key,{python,version:entry.version});}catch{}
    const result:Candidate[]=[],queue=[...roots.values()];let index=0;
    await Promise.all(Array.from({length:3},async()=>{while(index<queue.length){const {python,version}=queue[index++];try{await this.host.execute(python,['-m','pipx','--version'],{cwd:this.host.root(),signal,timeout:15000});result.push({path:python,python,sources:[`Python ${version} 根环境`]});}catch{}}}));
    return result;
  }
  private async performScan(kind:InventoryKind):Promise<ProgramEntry[]>{
    const candidates:Candidate[]=[],names:Record<InventoryKind,string[]>={python:[],uv:['uv'],pipx:['pipx'],babeldoc:['babeldoc'],pdfmath:['pdf2zh'],tex:['xelatex','pdflatex'],latexml:['latexmlc','latexml_oxide'],base:[]};
    const automatic=kind==='python'?await (this.host.pythonPaths?.()??this.systemPythons()):await this.pathCandidates(names[kind]);
    for(const original of automatic){const path=kind==='python'?await nativePython(original):original;if(path&&await fileExists(path))candidates.push({path,sources:[kind==='python'?'系统扫描':'PATH']});}
    if(kind==='pipx')candidates.push(...await this.pipxCandidates());
    for(const registration of [...(this.config().installed[kind]||[]),...await this.host.registered(kind)]){const path=kind==='python'?await nativePython(registration.path):registration.path;if(path&&await fileExists(path))candidates.push({...registration,path,sources:[registration.manager||'自动安装']});}
    for(const original of this.config().manual[kind]||[]){const path=kind==='python'?await nativePython(original):original;if(!path)continue;candidates.push({path,manualPaths:[original],sources:['手动添加']});}
    const selectedPython=this.host.config().pythonRuntime;if(kind==='python'&&selectedPython){const path=await nativePython(selectedPython);if(path&&await fileExists(path))candidates.push({path,sources:['运行版本']});}
    let active:{path:string;python?:string}|undefined;
    if(!utilityProgram(kind))try{active=await this.host.selected(kind);if(active.path&&await fileExists(active.path))candidates.push({...active,sources:['当前配置']});}catch{}
    const seen=new Map<string,Candidate>();for(const item of candidates){const key=process.platform==='win32'?item.path.toLowerCase():item.path,old=seen.get(key);if(old){old.sources=[...new Set([...old.sources,...item.sources])];old.manualPaths=[...new Set([...(old.manualPaths||[]),...(item.manualPaths||[])])];old.python ||= item.python;}else seen.set(key,item);}
    const queue=[...seen.values()],inspected:ProgramEntry[]=[];let index=0;
    await Promise.all(Array.from({length:3},async()=>{while(index<queue.length)inspected.push(await this.inspect(kind,queue[index++]));}));
    const merged=await mergePrograms(inspected);this.records.set(kind,merged);
    if(active?.path){const identity=await installationIdentity(kind,active.path,active.python||(['babeldoc','pdfmath'].includes(kind)?await launcherPython(active.path):undefined));this.selectedIds.set(kind,createHash('sha256').update(identity).digest('hex').slice(0,20));}else this.selectedIds.delete(kind);
    this.revision++;return merged;
  }
  private async inspect(kind:InventoryKind,item:Candidate):Promise<ProgramEntry>{
    const entry:ProgramEntry={id:'',kind,version:'未知',...item};
    try{
      if(!await fileExists(item.path))throw Error('程序文件不存在。');
      const options={cwd:this.host.root(),signal:new AbortController().signal,timeout:30000};let output:string;
      if(kind==='python'){output=String((await this.host.execute(item.path,['-c',pythonRuntimeProbeCode],options)).text);const probe=parsePythonRuntime(output);entry.runtime=assessPythonRuntime(probe);entry.version=probe.version;entry.directory=probe.prefix;return entry;}
      else if(kind==='pipx'){
        const launcher=entry.python||await launcherPython(item.path),python=launcher?await nativePython(launcher):'';if(python)entry.python=python;
        output=String((await this.host.execute(python||item.path,python?['-m','pipx','--version']:['--version'],options)).text);
      }else if(kind==='babeldoc'||kind==='pdfmath'){
        const python=entry.python||await launcherPython(item.path);entry.python=python||undefined;
        const env=await this.host.programEnvironment?.(python||item.path);
        entry.version=await probeTranslationProgram(kind,item.path,python,this.host.execute,this.host.root(),options.signal,env);
        return entry;
      }else if(kind==='base'){
        const python=entry.python||await launcherPython(item.path);
        if(python){entry.python=python;output=String((await this.host.execute(python,['-c','import pymupdf,pylatexenc,sys;print(sys.version.split()[0])'],options)).text);}
        else output=String((await this.host.execute(item.path,['--version'],options)).text);
      }else if(kind==='latexml'&&/\.bat$/i.test(item.path)){
        const perl=this.host.config().latexml.perl||await findExecutable('perl');if(!perl)throw Error('LaTeXML 脚本需要 Perl。');output=String((await this.host.execute(perl,['-x',item.path,'--version'],options)).text);
      }else output=String((await this.host.execute(item.path,['--version'],options)).text);
      entry.version=output.trim().split(/\r?\n/)[0].slice(0,100)||'未知';
    }catch(error){entry.error=error instanceof Error?error.message:String(error);}
    return entry;
  }
}
