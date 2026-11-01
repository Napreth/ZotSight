import {mkdir,readFile,writeFile,readdir,lstat} from 'node:fs/promises';
import {join,relative,dirname} from 'node:path';
import type {ZotSightAPI,Job} from './types';

export function artifactPath(path:string):string{if(!path||path.startsWith('/')||path.includes('\\')||/[\x00-\x1f:]/.test(path)||path.split('/').some(p=>!p||p==='.'||p==='..'))throw Error('翻译产物路径无效。');return path;}
const allowed=(path:string)=>{
  if(/^(?:job\.json|translation-cache\.json|source\.(?:sdt\.json|txt)|arxiv-source\.tar|project\.json|tex-units\.json|tex\.txt|translated-units\.json|translated\.txt|layout-translations\.json|reading-translation\.json)$/.test(path))return true;
  if(!/^(?:source-latex|latex-source|pdf)\//.test(path))return false;
  if(path.includes('/.zst-build/'))return /\.log$/i.test(path);
  return /^(?:LICENSE|LICENCE|COPYING|NOTICE)(?:[._-]|$)/i.test(path.split('/').pop()!)||/\.(tex|sty|cls|bib|bst|bbl|pdf|png|jpe?g|eps|bbx|cbx|def|cfg|clo|fd|otf|ttf|txt|md|html|log)$/i.test(path);
};
export class ArtifactWorkspace {
  constructor(private core:()=>ZotSightAPI,readonly directory:string,readonly job:Job){}
  get prefix():string{return `translate/${this.job.id}/`;}
  async hydrate():Promise<void>{
    const core=this.core(),entries=await core.listPackageFiles(this.job.path,this.prefix);let size=0;
    for(const entry of entries){const name=artifactPath(entry.slice(this.prefix.length));if(name==='job.json'||!allowed(name))continue;const data=await core.readPackageFile(this.job.path,entry);if(!data)continue;if((size+=data.byteLength)>512*1024*1024)throw Error('翻译工作目录超过 512 MB。');const path=join(this.directory,name);await mkdir(dirname(path),{recursive:true});if(name==='translation-cache.json'){try{const local=JSON.parse(await readFile(path,'utf8')),saved=JSON.parse(new TextDecoder().decode(data));if(local.schemaVersion===1&&saved.schemaVersion===1){await writeFile(path,JSON.stringify({...saved,entries:{...saved.entries,...local.entries}}));continue;}}catch{}}await writeFile(path,data);}
  }
  async checkpoint():Promise<void>{
    const files:Record<string,Uint8Array|string>={[`${this.job.id}/job.json`]:JSON.stringify(this.job,null,2)+'\n'};let size=0;
    const walk=async(dir:string)=>{try{for(const entry of await readdir(dir,{withFileTypes:true})){if(entry.isSymbolicLink())continue;const path=join(dir,entry.name);if(entry.isDirectory())await walk(path);else{const name=relative(this.directory,path).replaceAll('\\','/');if(!allowed(name)||name==='job.json'||this.job.deletedOutputs?.includes(this.prefix+name))continue;const stat=await lstat(path);if(stat.isSymbolicLink()||(size+=stat.size)>512*1024*1024)throw Error('翻译产物超过 512 MB。');files[`${this.job.id}/${artifactPath(name)}`]=new Uint8Array(await readFile(path));}}}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}};
    await walk(this.directory);await this.core().writeExtensionFiles(this.job.path,'translate',files);
  }
}
