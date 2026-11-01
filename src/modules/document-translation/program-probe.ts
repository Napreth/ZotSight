import type {ProgramKind} from './dependency-types';
import {programSpecs} from './dependency-types';
import type {command} from './process';

export async function probeTranslationProgram(kind:ProgramKind,path:string,python:string|undefined,execute:typeof command,cwd:string,signal:AbortSignal,env:NodeJS.ProcessEnv={}):Promise<string>{
  const spec=programSpecs[kind];
  const result=python
    ?await execute(python,['-c',`import importlib,importlib.metadata;importlib.import_module('${spec.distribution}');import pymupdf;print(importlib.metadata.version('${spec.distribution}'))`],{cwd,signal,timeout:60000,env})
    :await execute(path,['--version'],{cwd,signal,timeout:30000,env});
  if(python&&Object.keys(env).length)await execute(python,['-m','pip','--isolated','check'],{cwd,signal,timeout:60000,env});
  return String(result.text||'已检测到程序').trim().split(/\r?\n/).at(-1)!;
}
