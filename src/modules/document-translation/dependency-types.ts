import {join} from 'node:path';
import {homedir} from 'node:os';
export type ProgramKind='babeldoc'|'pdfmath';
export type DependencyKind=ProgramKind|'base'|'tex'|'latexml'|'python'|'uv'|'pipx';
export interface DependencyStatus {phase:'unknown'|'checking'|'installing'|'ready'|'error'|'cancelled';operation?:'check'|'install';message:string;version?:string;path?:string;python?:string;signature?:string;checkedAt?:string}

export type InstallMethod='existing'|'uv'|'pipx'|'venv';
export interface ProgramConfig {method:InstallMethod;executable:string;python:string;uv:string;pipx:string;pipxPython?:string;environmentPython?:string;configured?:boolean;pythonExplicit?:boolean;installMethod?:Exclude<InstallMethod,'existing'>;installVersion?:string}
export interface DependencyConfig {
  pythonRuntime?:string;
  inventory?:import('./inventory-types').InventoryConfig;
  pythonInstall?:{version:string};uv?:{executable?:string;installVersion:string};pipxInstall?:{python:string;version?:string};
  statuses?:Partial<Record<DependencyKind,DependencyStatus>>;
  programs:Record<ProgramKind,ProgramConfig>;
  base:{installPython?:string;installMethod?:'uv'|'venv';method:'existing'|'uv'|'venv';python:string;uv:string;environmentPython?:string;configured?:boolean;pythonExplicit?:boolean};
  tex:{installMethod?:'portable-full'|'portable-basic';method:'existing'|'portable-full'|'portable-basic';directory:string;installer?:string;preparedLanguages?:string[]};
  latexml:{method:'existing'|'oxide';executable:string;directory:string;perl?:string};
}
// Validated locks: NumPy 2.5.4 / SciPy 1.18.1 require Python >=3.12.
export const programSpecs={babeldoc:{name:'BabelDOC',pythonMin:12,pythonMax:14,command:'babeldoc',distribution:'babeldoc',requirement:'babeldoc==0.6.4'},pdfmath:{name:'PDFMathTranslate',pythonMin:12,pythonMax:13,command:'pdf2zh',distribution:'pdf2zh',requirement:'pdf2zh @ https://github.com/PDFMathTranslate/PDFMathTranslate/archive/6e982e2c33ddecd225b8a34af3a61c597f223c77.zip#sha256=34edc5bfd4fde1b3b51b733896c1793fc46aed926dee46c73605310e11dfffbe'}} as const;
export const emptyProgram=():ProgramConfig=>({method:'uv',executable:'',python:'',uv:'',pipx:''});
export function defaultDependencies():DependencyConfig{return {programs:{babeldoc:emptyProgram(),pdfmath:emptyProgram()},base:{method:'uv',python:'',uv:''},tex:{method:'existing',directory:''},latexml:{method:'existing',executable:'',directory:''}};}
export function dependencyRoot(env:NodeJS.ProcessEnv=process.env,platform=process.platform):string{return platform==='win32'?join(env.LOCALAPPDATA||join(homedir(),'AppData','Local'),'ZotSight'):join(env.XDG_DATA_HOME||join(homedir(),'.local','share'),'ZotSight');}
