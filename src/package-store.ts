import type {TFile,Vault} from 'obsidian';
import {LiteraturePackage,binaryBuffer} from './package';
import {parseSeed,type Seed} from './model';

/** Serialize updates per file so notes and companion artifacts cannot overwrite one another. */
export class PackageStore {
  private writes=new WeakMap<TFile,Promise<unknown>>();
  private migrating=new WeakSet<TFile>();
  constructor(private vault:Vault){}
  read(file:TFile):Promise<LiteraturePackage>{return this.exclusive(file,()=>this.disk(file));}
  exclusive<T>(file:TFile,operation:()=>Promise<T>):Promise<T>{const work=(this.writes.get(file)||Promise.resolve()).catch(()=>{}).then(operation);this.writes.set(file,work);return work;}
  private async disk(file:TFile):Promise<LiteraturePackage>{if(file.extension==='zsseed'){const pkg=new LiteraturePackage();pkg.setSeed(parseSeed(await this.vault.read(file)));return pkg;}const bytes=new Uint8Array(await this.vault.readBinary(file));if(this.migrating.has(file)&&bytes[0]!==0x50){const pkg=new LiteraturePackage();pkg.setSeed(parseSeed(new TextDecoder().decode(bytes)));return pkg;}return new LiteraturePackage(bytes);}
  async migrate(file:TFile,rename:()=>Promise<void>):Promise<void>{this.migrating.add(file);try{await rename();await this.update(file,()=>{});}finally{this.migrating.delete(file);}}
  update<T>(file:TFile,change:(pkg:LiteraturePackage)=>T|Promise<T>):Promise<T>{return this.exclusive(file,async()=>{const pkg=await this.disk(file),result=await change(pkg);if(pkg.dirty){if(file.extension==='zsseed')await this.vault.modify(file,JSON.stringify(pkg.seed(),null,2)+'\n');else await this.vault.modifyBinary(file,binaryBuffer(pkg.encode()));}return result;});}
  async save(file:TFile,next:Seed,previous?:Seed):Promise<void>{await this.update(file,pkg=>{const merged=pkg.seed();for(const key of Object.keys(next))if(!previous||JSON.stringify(next[key])!==JSON.stringify(previous[key]))merged[key]=next[key];pkg.setSeed(merged);});}
}
