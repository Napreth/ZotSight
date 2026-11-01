export type InventoryKind='python'|'uv'|'pipx'|'babeldoc'|'pdfmath'|'tex'|'latexml'|'base';
export interface ProgramEntry {id:string;kind:InventoryKind;path:string;version:string;sources:string[];aliases?:string[];python?:string;manualPaths?:string[];manager?:string;directory?:string;error?:string;runtime?:import('./python-runtime').PythonRuntimeCheck}
export interface ProgramRegistration {path:string;python?:string;version?:string;manager?:string;directory?:string}
export interface InventoryConfig {manual:Partial<Record<InventoryKind,string[]>>;installed:Partial<Record<InventoryKind,ProgramRegistration[]>>;sections?:Partial<Record<InventoryKind,{collapsed:boolean;tab:'programs'|'install'}>>}
export interface ReleaseChoice {version:string;url:string;digest?:string;checksumUrl?:string}
