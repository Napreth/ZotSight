import type {InventoryKind} from './inventory-types';

export function programFileFilters(kind:InventoryKind|'perl',platform=process.platform):{name:string;extensions:string[]}[]{
  if(platform==='win32')return [{name:kind==='latexml'?'LaTeXML 程序或脚本':'可执行程序',extensions:kind==='latexml'?['exe','bat','pl']:['exe']}];
  return [{name:'程序',extensions:['*']}];
}
