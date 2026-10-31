import {deflateSync,inflateSync} from 'fflate';
import {newSeed,parseSeed,type Seed} from './model';

const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
const MAX=512*1024*1024,MAX_TOTAL=1024*1024*1024;
const table=Uint32Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc(bytes:Uint8Array):number{let n=0xffffffff;for(const b of bytes)n=table[(n^b)&255]^(n>>>8);return (n^0xffffffff)>>>0;}
export function packagePath(path:string):string{if(!path||path.startsWith('/')||path.includes('\\')||/[\x00-\x1f:]/.test(path)||path.split('/').some(p=>!p||p==='.'||p==='..'))throw Error('文献包内路径无效。');return path;}
interface Entry {name:string;method:number;crc:number;size:number;compressed:Uint8Array}
/** ZIP32 container. Unchanged members keep their compressed bytes on every save. */
export class LiteraturePackage {
  dirty=false;
  private entries=new Map<string,Entry>();
  constructor(bytes?:Uint8Array){
    if(!bytes)return;if(bytes.length>MAX_TOTAL)throw Error('文献包超过 1 GB。');const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let end=-1;
    for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(v.getUint32(i,true)===0x06054b50&&i+22+v.getUint16(i+20,true)===bytes.length){end=i;break;}
    if(end<0)throw Error('文献包不是有效的 ZIP。原文件不会被覆盖。');
    const count=v.getUint16(end+10,true),start=v.getUint32(end+16,true),length=v.getUint32(end+12,true);
    if(v.getUint16(end+4,true)||v.getUint16(end+6,true)||v.getUint16(end+8,true)!==count||count===65535||start+length!==end)throw Error('不支持分卷或 ZIP64 文献包。');
    let offset=start,total=0;
    for(let i=0;i<count;i++){
      if(offset+46>end||v.getUint32(offset,true)!==0x02014b50)throw Error('文献包目录损坏。');
      const flags=v.getUint16(offset+8,true),method=v.getUint16(offset+10,true),checksum=v.getUint32(offset+16,true),compressed=v.getUint32(offset+20,true),size=v.getUint32(offset+24,true),n=v.getUint16(offset+28,true),extra=v.getUint16(offset+30,true),comment=v.getUint16(offset+32,true),local=v.getUint32(offset+42,true);
      if(offset+46+n+extra+comment>end||local+30>start||v.getUint32(local,true)!==0x04034b50||flags&1||![0,8].includes(method)||size>MAX||(total+=size)>MAX_TOTAL||v.getUint16(offset+34,true))throw Error('文献包含有不支持或过大的 ZIP 成员。');
      const name=decoder.decode(bytes.subarray(offset+46,offset+46+n));offset+=46+n+extra+comment;
      const data=local+30+v.getUint16(local+26,true)+v.getUint16(local+28,true);
      if(data+compressed>start||v.getUint16(local+8,true)!==method||v.getUint16(local+6,true)!==flags||decoder.decode(bytes.subarray(local+30,local+30+v.getUint16(local+26,true)))!==name)throw Error('文献包成员损坏。');
      if(name.endsWith('/')){packagePath(name.slice(0,-1));continue;}packagePath(name);
      if(this.entries.has(name))throw Error('文献包中存在重名成员。');this.entries.set(name,{name,method,crc:checksum,size,compressed:bytes.subarray(data,data+compressed)});
    }
    if(offset!==end)throw Error('文献包目录长度无效。');
  }
  list(prefix=''):string[]{return [...this.entries.keys()].filter(name=>name.startsWith(prefix)).sort();}
  read(name:string):Uint8Array|null{const e=this.entries.get(packagePath(name));if(!e)return null;const bytes=e.method===0?e.compressed.slice():inflateSync(e.compressed,{out:new Uint8Array(e.size)});if(bytes.length!==e.size||crc(bytes)!==e.crc)throw Error(`文献包成员校验失败：${name}`);return bytes;}
  text(name:string):string|null{const bytes=this.read(name);return bytes===null?null:decoder.decode(bytes);}
  set(name:string,data:Uint8Array|string):void{packagePath(name);const bytes=typeof data==='string'?encoder.encode(data):data;if(bytes.length>MAX)throw Error('包内单个文件超过 512 MB。');const checksum=crc(bytes),old=this.entries.get(name);if(old&&old.size===bytes.length&&old.crc===checksum)return;const packed=bytes.length<8*1024*1024&&!/\.(pdf|zip|gz|png|jpe?g|tar)$/i.test(name)?deflateSync(bytes,{level:6}):bytes;this.entries.set(name,{name,method:packed===bytes?0:8,crc:checksum,size:bytes.length,compressed:packed});this.dirty=true;}
  seed():Seed{const manifest=this.text('manifest.json'),note=this.text('notes/main.md'),annotations=this.text('annotations.json');if(manifest===null||note===null||annotations===null)throw Error('文献包缺少 manifest.json、notes/main.md 或 annotations.json。');const raw=JSON.parse(manifest);if(raw.format!=='ZotSight Literature Package'||raw.packageVersion!==1)throw Error('不支持的文献包版本。');delete raw.format;delete raw.packageVersion;return parseSeed(JSON.stringify({...raw,note,annotations:JSON.parse(annotations)}));}
  setSeed(seed:Seed):void{const {note,annotations,...manifest}=seed;this.set('manifest.json',JSON.stringify({format:'ZotSight Literature Package',packageVersion:1,...manifest},null,2)+'\n');this.set('notes/main.md',note);this.set('annotations.json',JSON.stringify(annotations,null,2)+'\n');}
  encode():Uint8Array{
    if(this.entries.size>=65535)throw Error('文献包内文件过多。');const local:Uint8Array[]=[],central:Uint8Array[]=[];let offset=0,centralSize=0,total=0;
    for(const e of this.entries.values()){
      if((total+=e.size)>MAX_TOTAL)throw Error('文献包内容超过 1 GB。');const name=encoder.encode(e.name);if(name.length>65535)throw Error('包内文件名过长。');
      const header=new Uint8Array(30+name.length),v=new DataView(header.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(8,e.method,true);v.setUint16(12,33,true);v.setUint32(14,e.crc,true);v.setUint32(18,e.compressed.length,true);v.setUint32(22,e.size,true);v.setUint16(26,name.length,true);header.set(name,30);local.push(header,e.compressed);
      const directory=new Uint8Array(46+name.length),c=new DataView(directory.buffer);c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint16(10,e.method,true);c.setUint16(14,33,true);c.setUint32(16,e.crc,true);c.setUint32(20,e.compressed.length,true);c.setUint32(24,e.size,true);c.setUint16(28,name.length,true);c.setUint32(42,offset,true);directory.set(name,46);central.push(directory);centralSize+=directory.length;offset+=header.length+e.compressed.length;
    }
    if(offset+centralSize+22>MAX_TOTAL)throw Error('文献包超过 1 GB。');const end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,this.entries.size,true);v.setUint16(10,this.entries.size,true);v.setUint32(12,centralSize,true);v.setUint32(16,offset,true);const out=new Uint8Array(offset+centralSize+22);let pos=0;for(const bytes of [...local,...central,end]){out.set(bytes,pos);pos+=bytes.length;}return out;
  }
}
export function createPackage(seed:Seed=newSeed()):Uint8Array{const pkg=new LiteraturePackage();pkg.setSeed(seed);return pkg.encode();}
export const binaryBuffer=(bytes:Uint8Array):ArrayBuffer=>Uint8Array.from(bytes).buffer;
