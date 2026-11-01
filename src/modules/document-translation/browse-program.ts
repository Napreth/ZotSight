import {Notice} from 'obsidian';
import {remote} from 'electron';
import {programFileFilters} from './program-file-filters';
import type {InventoryKind} from './inventory-types';
import {message} from './types';

export async function browse(parent:HTMLElement,change:(path:string)=>void,kind:InventoryKind|'perl'='python'):Promise<void>{try{const owner=remote.BrowserWindow.getFocusedWindow()||remote.getCurrentWindow(),result=await remote.dialog.showOpenDialog(owner,{title:'选择程序',properties:['openFile'],filters:programFileFilters(kind)});if(!result.canceled&&result.filePaths[0]&&parent.isConnected)change(result.filePaths[0]);}catch(error){new Notice(message(error));}}
