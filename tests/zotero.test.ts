import test from 'node:test';
import assert from 'node:assert/strict';
import { attachmentsOf, metadataOf, ZoteroClient, type Response } from '../src/zotero';
const source={provider:'zotero' as const,libraryType:'user' as const,libraryId:'0',itemKey:'ABCD1234'};
test('search encodes user input and paginates the local library',async()=>{
  let requested='';const client=new ZoteroClient(()=> 'http://127.0.0.1:23119/api',async url=>{requested=url;return {status:200,text:'[]',json:[]};},()=>source);
  await client.search('AI & 安全',50);const url=new URL(requested);assert.equal(url.searchParams.get('q'),'AI & 安全');assert.equal(url.searchParams.get('start'),'50');assert.equal(url.pathname,'/api/users/0/items/top');
});
test('unavailable, forbidden and missing attachment errors are actionable',async()=>{
  for(const [status,pattern] of [[403,/高级/],[404,/下载/],[500,/HTTP 500/]] as const){const client=new ZoteroClient(()=> 'http://localhost:23119/api',async()=>({status,text:'',json:null}),()=>source);await assert.rejects(client.search(''),pattern);}
  const offline=new ZoteroClient(()=> 'http://localhost:23119/api',async()=>{throw Error('ECONNREFUSED');},()=>source);await assert.rejects(offline.search(''),/启动 Zotero/);
});
test('attachment file URL uses local endpoint and refuses remote URLs',async()=>{
  let requested='';let result='file:///C:/Zotero/storage/EFGH5678/paper.pdf';const client=new ZoteroClient(()=> 'http://localhost:23119/api',async url=>{requested=url;return {status:200,text:result,json:null};},()=>source);
  assert.equal(await client.attachmentURL(source,'EFGH5678'),result);assert.match(requested,/items\/EFGH5678\/file\/view\/url$/);result='https://example.com/paper.pdf';await assert.rejects(client.attachmentURL(source,'EFGH5678'),/本地/);
});
test('only PDF attachments are imported and metadata has a readable author list',()=>{
  const children=[{key:'EFGH5678',data:{itemType:'attachment',contentType:'application/pdf',title:'Preprint PDF'}},{key:'HTML1234',data:{itemType:'attachment',contentType:'text/html'}},{key:'NOTE1234',data:{itemType:'note'}}];assert.equal(attachmentsOf(children).length,1);
  const m=metadataOf({key:'ABCD1234',data:{title:'Paper',date:'2026-10-29',creators:[{firstName:'Ada',lastName:'Lovelace'},{name:'Research Group'}],tags:[{tag:'AI'}]}});assert.equal(m.authors,'Ada Lovelace, Research Group');assert.equal(m.year,'2026');assert.deepEqual(m.tags,['AI']);
});
