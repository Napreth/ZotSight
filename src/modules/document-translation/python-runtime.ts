import type {command} from './process';

// Requires-Python metadata for the exact versions in requirements-base.lock.
// Sources: https://pypi.org/pypi/{distribution}/{version}/json
export const documentPythonRequirements=[
  {distribution:'lxml',version:'6.0.2',requiresPython:'>=3.8'},
  {distribution:'pylatexenc',version:'2.11',requiresPython:null},
  {distribution:'pymupdf',version:'1.26.7',requiresPython:'>=3.10'},
] as const;
const minimumVersion=documentPythonRequirements.flatMap(pkg=>pkg.requiresPython?[pkg.requiresPython.slice(2).split('.').map(Number)]:[]).sort((a,b)=>b[0]-a[0]||b[1]-a[1])[0];
export const pythonRuntimeRange='Python ≥'+minimumVersion.join('.');
export interface PythonRuntimeProbe {
  version:string;major:number;minor:number;implementation:string;releaseLevel:string;
  prefix:string;pip:boolean;venv:boolean;ensurepip:boolean;freeThreaded:boolean;
}
export interface PythonRuntimeCheck {ready:boolean;issues:string[];probe:PythonRuntimeProbe}
export class PythonDependencyError extends Error {
  constructor(detail:string){super(detail);this.name='PythonDependencyError';}
}
export const pythonRuntimeProbeCode=[
  'import importlib,json,sys,sysconfig',
  'def available(name):',
  '    try:',
  '        importlib.import_module(name)',
  '        return True',
  '    except Exception:',
  '        return False',
  'print(json.dumps({"version":sys.version.split()[0],"major":sys.version_info.major,"minor":sys.version_info.minor,"implementation":sys.implementation.name,"releaseLevel":sys.version_info.releaselevel,"prefix":sys.prefix,"pip":available("pip"),"venv":available("venv"),"ensurepip":available("ensurepip"),"freeThreaded":bool(sysconfig.get_config_var("Py_GIL_DISABLED"))}))',
].join('\n');
export function supportedPythonVersion(version:string):boolean{const match=/^(\d+)\.(\d+)(?:\.(\d+))?(.*)$/.exec(version);if(!match)return false;const major=Number(match[1]),minor=Number(match[2]);return major>minimumVersion[0]||major===minimumVersion[0]&&(minor>minimumVersion[1]||minor===minimumVersion[1]&&(!/^(a|b|rc|\.?dev)/i.test(match[4])||Number(match[3])>0));}
export function assessPythonRuntime(probe:PythonRuntimeProbe):PythonRuntimeCheck{
  const issues:string[]=[];
  if(!supportedPythonVersion(probe.version))issues.push(`PyMuPDF ${documentPythonRequirements[2].version} 要求 ${pythonRuntimeRange}。`);
  if(!probe.pip)issues.push('缺少 pip。');
  if(!probe.venv)issues.push('缺少 venv。');
  else if(!probe.ensurepip)issues.push('venv 缺少 ensurepip，无法为虚拟环境初始化 pip。');
  return {ready:!issues.length,issues,probe};
}
export function parsePythonRuntime(text:string):PythonRuntimeProbe{
  const probe=JSON.parse(text.trim().split(/\r?\n/).reverse().find(line=>line.trim().startsWith('{'))||'');
  if(typeof probe.version!=='string'||!Number.isInteger(probe.major)||!Number.isInteger(probe.minor)||typeof probe.prefix!=='string'||typeof probe.implementation!=='string'||['pip','venv','ensurepip','freeThreaded'].some(key=>typeof probe[key]!=='boolean'))throw Error('Python 检查结果无效。');
  return probe;
}
export async function inspectPythonRuntime(path:string,execute:typeof command,cwd:string,signal:AbortSignal):Promise<PythonRuntimeCheck>{
  const result=await execute(path,['-c',pythonRuntimeProbeCode],{cwd,signal,timeout:30000});
  return assessPythonRuntime(parsePythonRuntime(String(result.text)));
}
