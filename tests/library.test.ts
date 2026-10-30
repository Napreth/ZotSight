import test from 'node:test';
import assert from 'node:assert/strict';
import { ZoteroClient } from '../src/zotero';
const library={libraryType:'user' as const,libraryId:'0'};
const response=(json:unknown)=>({status:200,text:JSON.stringify(json),json});
test('the library browser discovers personal and group libraries',async()=>{
  const client=new ZoteroClient(()=>'http://localhost:23119/api',async url=>{assert.match(url,/users\/0\/groups/);return response([{id:42,data:{name:'Research Lab'}},{id:84,data:{name:'Reading Group'}}]);},()=>library);
  assert.deepEqual(await client.libraries(),[{...library,name:'我的文库'},{libraryType:'group',libraryId:'42',name:'Research Lab'},{libraryType:'group',libraryId:'84',name:'Reading Group'}]);
});
test('collection browsing keeps the selected library and nested collection identity',async()=>{
  let requested='';const client=new ZoteroClient(()=>'http://localhost:23119/api',async url=>{requested=url;return response(Array.from({length:51},(_,i)=>({key:String(i),data:{itemType:'book'}})));},()=>library);
  const result=await client.browse({libraryType:'group',libraryId:'42'},'AI & 安全',50,'ABCD1234');const url=new URL(requested);
  assert.equal(url.pathname,'/api/groups/42/collections/ABCD1234/items/top');assert.equal(url.searchParams.get('q'),'AI & 安全');assert.equal(result.items.length,50);assert.equal(result.hasMore,true);
});
test('localized item metadata retains empty fields, creator roles and collection memberships',async()=>{
  const client=new ZoteroClient(()=>'http://localhost:23119/api',async url=>{
    if(url.includes('/itemTypeFields?'))return response([{field:'title',localized:'标题'},{field:'repository',localized:'仓库'},{field:'DOI',localized:'DOI'}]);
    if(url.includes('/itemTypeCreatorTypes?'))return response([{creatorType:'author',localized:'作者'}]);
    if(url.endsWith('/itemTypes'))return response([{itemType:'preprint',localized:'预印本'}]);
    if(url.includes('/collections?'))return response([{key:'ABCD1234',data:{name:'Security',parentCollection:false}}]);
    throw Error(url);
  },()=>library);
  const metadata=await client.describe({key:'PAPER123',library:{id:0,name:'我的文库',type:'user'},data:{itemType:'preprint',title:'Paper',creators:[{firstName:'Ada',lastName:'Lovelace',creatorType:'author'}],collections:['ABCD1234']}},{...library,provider:'zotero',itemKey:'PAPER123'},[{key:'PDF12345',data:{itemType:'attachment',title:'Preprint PDF',contentType:'application/pdf'}}]);
  assert.equal(metadata.itemTypeLabel,'预印本');assert.equal(metadata.fields?.find(f=>f.key==='repository')?.value,'');assert.deepEqual(metadata.creators,[{name:'Lovelace, Ada',role:'作者'}]);assert.equal(metadata.collections?.[0].name,'Security');assert.equal(metadata.allAttachments?.[0].title,'Preprint PDF');
});
