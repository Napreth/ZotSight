import { Attachment, libraryPrefix, Metadata, validateBaseURL, ZoteroSource } from './model';
export interface Library {libraryType:'user'|'group';libraryId:string;name:string}
export interface ZoteroCollection {key:string;data:{name:string;parentCollection:string|false};meta?:{numItems?:number;numCollections?:number}}
export interface ZoteroItem {key: string; data: Record<string, any>; meta?: {creatorSummary?: string; parsedDate?: string}; links?: Record<string, any>;library?:{id:number;name:string;type:string}}
export interface Response {status: number; text: string; json: any}
export type Transport = (url: string) => Promise<Response>;
export class ZoteroClient {
  private descriptions=new Map<string,Promise<{fields:{field:string;localized:string}[];creators:{creatorType:string;localized:string}[];types:{itemType:string;localized:string}[]}>>();
  constructor(private base: () => string, private transport: Transport, private library: () => Pick<ZoteroSource,'libraryType'|'libraryId'>) {}
  private async get(path: string): Promise<Response> {
    const url = `${validateBaseURL(this.base())}/${path}`;
    let response: Response;
    try { response = await this.transport(url); } catch {throw new Error('无法连接 Zotero。请启动 Zotero，并在“设置 → 高级”中允许其他应用与 Zotero 通信。');}
    if (response.status === 403) throw new Error('Zotero 拒绝访问。请在 Zotero“设置 → 高级”中开启本地 API。');
    if (response.status === 404) throw new Error('Zotero 中未找到此条目或附件。请检查文献库与 ItemKey，或确认附件已下载。');
    if (response.status < 200 || response.status >= 300) throw new Error(`Zotero 返回 HTTP ${response.status}。`);
    return response;
  }
  async search(query: string, start = 0): Promise<ZoteroItem[]> {
    const q = new URLSearchParams({format:'json', limit:'50', start:String(start), q:query, itemType:'-attachment', sort:'dateModified', direction:'desc'});
    const data = (await this.get(`${libraryPrefix(this.library())}/items/top?${q}`)).json;
    if (!Array.isArray(data)) throw new Error('Zotero 返回了无法识别的条目列表。');
    return data;
  }
  async libraries():Promise<Library[]>{
    const groups=await this.list<any>('users/0/groups');
    const result:Library[]=[{libraryType:'user',libraryId:'0',name:'我的文库'},...groups.map(g=>({libraryType:'group' as const,libraryId:String(g.id||g.data?.id),name:g.data?.name||g.name||`群组 ${g.id}`}))];
    const configured=this.library();if(configured.libraryType==='group'&&!result.some(l=>l.libraryType==='group'&&l.libraryId===configured.libraryId))result.push({...configured,name:`群组 ${configured.libraryId}`});
    return result;
  }
  private async list<T>(path:string):Promise<T[]>{
    const result:T[]=[];for(let start=0;;start+=100){const data=(await this.get(`${path}?format=json&limit=100&start=${start}`)).json;if(!Array.isArray(data))throw new Error('Zotero 返回了无法识别的列表。');result.push(...data);if(data.length<100)break;}return result;
  }
  async collections(library:Pick<ZoteroSource,'libraryType'|'libraryId'>):Promise<ZoteroCollection[]>{return this.list<ZoteroCollection>(`${libraryPrefix(library)}/collections`);}
  async browse(library:Pick<ZoteroSource,'libraryType'|'libraryId'>,query:string,start=0,collection?:string):Promise<{items:ZoteroItem[];hasMore:boolean}>{
    if(collection&&!/^[A-Z0-9]{8}$/.test(collection))throw new Error('分类标识无效。');
    const params=new URLSearchParams({format:'json',limit:'51',start:String(start),q:query,itemType:'-attachment',sort:'title',direction:'asc'});
    const path=collection?`collections/${collection}/items/top`:'items/top';const data=(await this.get(`${libraryPrefix(library)}/${path}?${params}`)).json;
    if(!Array.isArray(data))throw new Error('Zotero 返回了无法识别的条目列表。');
    return {items:data.slice(0,50).filter(i=>!['attachment','note','annotation'].includes(i.data.itemType)),hasMore:data.length>50};
  }
  async describe(item:ZoteroItem,source:ZoteroSource,children:ZoteroItem[]=[]):Promise<Metadata>{
    const type=String(item.data.itemType||'document');let schema=this.descriptions.get(type);
    if(!schema){schema=Promise.all([this.get(`itemTypeFields?itemType=${encodeURIComponent(type)}`),this.get(`itemTypeCreatorTypes?itemType=${encodeURIComponent(type)}`),this.get('itemTypes')]).then(([fields,creators,types])=>({fields:fields.json,creators:creators.json,types:types.json}));this.descriptions.set(type,schema);schema.catch(()=>this.descriptions.delete(type));}
    const [description,collections]=await Promise.all([schema,this.collections(source)]);
    const metadata=metadataOf(item);
    metadata.itemTypeLabel=description.types.find(t=>t.itemType===type)?.localized||type;
    metadata.fields=description.fields.filter(f=>!['abstractNote'].includes(f.field)).map(f=>({key:f.field,label:f.localized,value:String(item.data[f.field]||'')}));
    metadata.fields.push(...['dateAdded','dateModified'].map(key=>({key,label:key==='dateAdded'?'添加日期':'修改日期',value:String(item.data[key]||'')})));
    metadata.creators=(item.data.creators||[]).map((c:any)=>({name:c.name||[c.lastName,c.firstName].filter(Boolean).join(', '),role:description.creators.find(t=>t.creatorType===c.creatorType)?.localized||'作者'}));
    metadata.collections=collections.filter(c=>(item.data.collections||[]).includes(c.key)).map(c=>({key:c.key,name:c.data.name}));
    metadata.libraryName=item.library?.name||(source.libraryType==='group'?`群组 ${source.libraryId}`:'我的文库');
    metadata.allAttachments=children.filter(c=>c.data.itemType==='attachment').map(c=>({key:c.key,title:c.data.title||c.data.filename||'附件',contentType:c.data.contentType||''}));
    return metadata;
  }
  async item(source: ZoteroSource): Promise<ZoteroItem> {
    if (!/^[A-Z0-9]{8}$/.test(source.itemKey)) throw new Error('ItemKey 应为 8 位大写字母或数字。');
    return (await this.get(`${libraryPrefix(source)}/items/${source.itemKey}`)).json;
  }
  async children(source: ZoteroSource): Promise<ZoteroItem[]> {
    const data = (await this.get(`${libraryPrefix(source)}/items/${source.itemKey}/children?format=json&limit=100`)).json;
    if (!Array.isArray(data)) throw new Error('Zotero 附件列表格式无效。');
    return data;
  }
  async attachmentURL(source: ZoteroSource, key: string): Promise<string> {
    if (!/^[A-Z0-9]{8}$/.test(key)) throw new Error('附件 ItemKey 无效。');
    const text = (await this.get(`${libraryPrefix(source)}/items/${key}/file/view/url`)).text.trim();
    if (!text.startsWith('file://')) throw new Error('附件不在本地。请先在 Zotero 中下载 PDF，或手动关联本地 PDF。');
    return text;
  }
}
export function metadataOf(item: ZoteroItem): Metadata {
  const d = item.data;
  return {title: d.title || '未命名文献', itemType:d.itemType, authors: (d.creators || []).map((c: any)=>c.name || [c.firstName,c.lastName].filter(Boolean).join(' ')).join(', ') || item.meta?.creatorSummary || '', year: (d.date || '').match(/\d{4}/)?.[0] || '', abstract: d.abstractNote || '', doi: d.DOI || '', publication: d.publicationTitle || d.proceedingsTitle || '', url: d.url || '', tags: (d.tags || []).map((t: any)=>t.tag),creators:(d.creators||[]).map((c:any)=>({name:c.name||[c.lastName,c.firstName].filter(Boolean).join(', '),role:'作者'}))};
}
export function attachmentsOf(items: ZoteroItem[]): Attachment[] {
  return items.filter(i=>i.data.itemType === 'attachment' && (i.data.contentType === 'application/pdf' || /\.pdf$/i.test(i.data.filename || ''))).map(i=>({id:`zotero:${i.key}`, kind:'zotero', key:i.key, title:i.data.title || i.data.filename || 'PDF', contentType:'application/pdf'}));
}
