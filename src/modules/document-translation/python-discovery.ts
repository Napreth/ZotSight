import {readFile,stat,realpath,readdir} from 'node:fs/promises';
import {join,dirname,basename,isAbsolute} from 'node:path';
import type {command} from './process';

const isFile=async(path:string)=>{try{return (await stat(path)).isFile();}catch{return false;}};

/** pyenv batch shims are references to an interpreter, not executable runtimes. */
export async function nativePython(path:string):Promise<string>{
  path=path.trim().replace(/^"(.*)"$/,'$1');
  if(!/\.(bat|cmd)$/i.test(path)){if(/[/\\]python(?:w|3(?:\.\d+)?)\.exe$/i.test(path)&&await isFile(join(dirname(path),'python.exe')))return join(dirname(path),'python.exe');return path;}
  if(basename(dirname(path)).toLowerCase()!=='shims')return '';
  const root=dirname(dirname(path));
  let versions=process.env.PYENV_VERSION||'';
  if(!versions)try{versions=await readFile(join(root,'version'),'utf8');}catch{}
  for(const version of versions.trim().split(/\s+/)){
    if(!/^[\w.-]+$/.test(version)||version.includes('..'))continue;
    let matches:string[]=[];try{matches=(await readdir(join(root,'versions'))).filter(item=>item===version||item.startsWith(version+'.')).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true}));}catch{}
    for(const match of matches){const candidate=join(root,'versions',match,'python.exe');if(await isFile(candidate))return realpath(candidate);}
  }
  return '';
}

export async function rootPython(path:string,execute:typeof command,cwd:string,signal:AbortSignal):Promise<string>{
  const native=await nativePython(path);
  if(!native||!isAbsolute(native)||!await isFile(native))throw Error('请选择有效的 Python 解释器。');
  const result=await execute(native,['-I','-c','import sys;print(getattr(sys,"_base_executable",None) or sys.executable)'],{cwd,signal,timeout:15000});
  const base=String(result.text).trim().split(/\r?\n/).at(-1)||'';
  if(!isAbsolute(base)||!await isFile(base))throw Error('未找到 Python 的根解释器。');
  return realpath(await nativePython(base));
}
