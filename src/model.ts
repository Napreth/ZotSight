export interface ZoteroSource {
  provider: 'zotero'; libraryType: 'user' | 'group'; libraryId: string; itemKey: string;
}
export interface Attachment {
  id: string; title: string; kind: 'zotero' | 'vault' | 'local' | 'package';
  key?: string; path?: string; contentType?: string;
  [key: string]: unknown;
}
export interface Metadata {
  title: string; authors: string; year: string; abstract: string; doi: string;
  publication: string; url: string; tags: string[]; [key: string]: unknown;
  itemType?: string; itemTypeLabel?: string;
  fields?: {key:string;label:string;value:string}[];
  creators?: {name:string;role:string}[];
  collections?: {key:string;name:string}[];
  libraryName?:string;
  allAttachments?: {key:string;title:string;contentType:string}[];
}
export interface Annotation {
  id: string; attachmentId: string; page: number; text: string; comment: string;
  color: string; rects: number[][]; createdAt: string; [key: string]: unknown;
  type?:'highlight'|'underline'|'note'|'area'|'text'|'ink';
  points?:number[][];
}
export interface Seed {
  schemaVersion: 1; source: ZoteroSource | null; metadata: Metadata;
  attachments: Attachment[]; note: string; annotations: Annotation[];
  reader: { attachmentId: string; page: number; zoom: number; split: number; [key: string]: unknown };
  createdAt: string; updatedAt: string; [key: string]: unknown;
}
export function newSeed(title = '未命名文献'): Seed {
  const now = new Date().toISOString();
  return {schemaVersion: 1, source: null, metadata: {title, authors: '', year: '', abstract: '', doi: '', publication: '', url: '', tags: []}, attachments: [], note: '', annotations: [], reader: {attachmentId: '', page: 1, zoom: 1, split: 57}, createdAt: now, updatedAt: now};
}
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
export function parseSeed(text: string): Seed {
  let raw: unknown;
  try { raw = JSON.parse(text.replace(/^\uFEFF/, '')); } catch { throw new Error('文献文件不是有效的 JSON。请修复文件后重新打开；原文件不会被覆盖。'); }
  if (!record(raw) || raw.schemaVersion !== 1) throw new Error('不支持的文献文件版本；请升级 ZotSight。原文件不会被覆盖。');
  if (typeof raw.note !== 'string') throw new Error('文献文件缺少 Markdown 笔记字段。');
  if (raw.source !== null && (!record(raw.source) || raw.source.provider !== 'zotero' || !['user','group'].includes(String(raw.source.libraryType)) || !/^\d+$/.test(String(raw.source.libraryId)) || !/^[A-Z0-9]{8}$/.test(String(raw.source.itemKey)))) throw new Error('Zotero 文献标识无效。');
  if (raw.metadata !== undefined && !record(raw.metadata)) throw new Error('文献信息格式无效。');
  if (raw.reader !== undefined && !record(raw.reader)) throw new Error('阅读状态格式无效。');
  for (const field of ['attachments','annotations']) if (raw[field] !== undefined && !Array.isArray(raw[field])) throw new Error(`${field} 格式无效。`);
  const base = newSeed();
  const seed = {...base, ...raw, metadata: {...base.metadata, ...(raw.metadata || {})}, reader: {...base.reader, ...(raw.reader || {})}} as Seed;
  if (typeof seed.metadata.title !== 'string' || !Array.isArray(seed.metadata.tags)) throw new Error('文献标题或标签格式无效。');
  for (const a of seed.attachments) if (!record(a) || typeof a.id !== 'string' || typeof a.title !== 'string' || !['vault','local','zotero','package'].includes(a.kind)) throw new Error('附件格式无效。');
  for (const a of seed.annotations) if (!record(a) || typeof a.id !== 'string' || typeof a.attachmentId !== 'string' || !Number.isInteger(a.page) || a.page < 1 || typeof a.text !== 'string' || typeof a.comment !== 'string' || !Array.isArray(a.rects) || a.rects.some(r=>!Array.isArray(r) || r.length !== 4 || r.some(n=>!Number.isFinite(n)))) throw new Error('批注格式无效。');
  for (const a of seed.annotations) if(a.points!==undefined&&(!Array.isArray(a.points)||a.points.some(p=>!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isFinite(n)))))throw new Error('手绘批注格式无效。');
  seed.reader.page = Math.max(1, Math.floor(Number(seed.reader.page) || 1));
  seed.reader.zoom = Math.max(.25, Math.min(5, Number(seed.reader.zoom) || 1));
  seed.reader.split = Math.max(30, Math.min(75, Number(seed.reader.split) || 57));
  return seed;
}
export const serializeSeed = (seed: Seed): string => JSON.stringify(seed, null, 2) + '\n';
export function safeFilename(title: string): string {
  const name = title.replace(/[<>:"/\\|?*\u0000-\u001f\[\]#^]/g, ' ').replace(/\s+/g,' ').trim().replace(/[. ]+$/g,'').slice(0,140).trim();
  return !name || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name) ? `文献 ${name}`.trim() : name;
}
export function libraryPrefix(source: Pick<ZoteroSource,'libraryType'|'libraryId'>): string {
  if (!/^\d+$/.test(source.libraryId)) throw new Error('文献库 ID 必须为数字。');
  return `${source.libraryType === 'group' ? 'groups' : 'users'}/${source.libraryId}`;
}
export function zoteroURI(source: ZoteroSource, attachmentKey?: string, page = 1): string {
  const library = source.libraryType === 'group' ? `groups/${source.libraryId}` : 'library';
  return attachmentKey ? `zotero://open-pdf/${library}/items/${attachmentKey}?page=${Math.max(1,page)}` : `zotero://select/${library}/items/${source.itemKey}`;
}
export function validateBaseURL(value: string): string {
  let url: URL;
  try {url = new URL(value);} catch {throw new Error('请输入有效的 Zotero 本地 API 地址。');}
  if (url.protocol !== 'http:' || !['localhost','127.0.0.1','[::1]'].includes(url.hostname) || url.username || url.password || url.search || url.hash) throw new Error('仅支持本机 HTTP 地址，例如 http://127.0.0.1:23119/api。');
  return url.href.replace(/\/$/,'');
}
