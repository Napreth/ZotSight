import test from 'node:test';
import assert from 'node:assert/strict';
import { libraryPrefix, newSeed, parseSeed, safeFilename, serializeSeed, validateBaseURL, zoteroURI } from '../src/model';
test('Markdown, annotations and extension fields survive a round trip',()=>{
  const seed=newSeed('中文 / Research');seed.note='# 思考\n\n[[文献/另一篇.zsseed]]\n\n$E=mc^2$';seed.customExtension={data:[1,2]};seed.reader.customState='keep';seed.annotations=[{id:'1',attachmentId:'a',page:2,text:'selected text',comment:'评论',color:'#f6cf69',rects:[[.1,.2,.3,.02]],createdAt:new Date().toISOString()}];
  assert.deepEqual(parseSeed(serializeSeed(seed)),seed);
});
test('damaged, truncated or future files fail instead of silently losing notes',()=>{
  for(const text of ['','{','[]','null','{"schemaVersion":2,"note":"hello"}','{"schemaVersion":1,"note":3}','{"schemaVersion":1,"source":null,"note":"hello","annotations":[{}]}'])assert.throws(()=>parseSeed(text));
});
test('minimal v1 document gains defaults and preserves notes',()=>{
  const seed=parseSeed('{"schemaVersion":1,"source":{"provider":"zotero","libraryType":"user","libraryId":"0","itemKey":"ABCD1234"},"note":"hello"}');
  assert.equal(seed.note,'hello');assert.equal(seed.reader.page,1);assert.deepEqual(seed.attachments,[]);
});
test('local API cannot be pointed at a remote endpoint',()=>{
  assert.equal(validateBaseURL('http://localhost:23119/api/'),'http://localhost:23119/api');
  assert.equal(validateBaseURL('http://127.0.0.1:23119/api'),'http://127.0.0.1:23119/api');
  for(const value of ['https://example.com/api','http://localhost.example.com/api','file:///etc/passwd','http://user:password@localhost/api'])assert.throws(()=>validateBaseURL(value));
});
test('identity includes library and creates correct desktop deep links',()=>{
  const source={provider:'zotero' as const,libraryType:'group' as const,libraryId:'123',itemKey:'ABCD1234'};
  assert.equal(libraryPrefix(source),'groups/123');assert.equal(zoteroURI(source),'zotero://select/groups/123/items/ABCD1234');assert.equal(zoteroURI(source,'EFGH5678',7),'zotero://open-pdf/groups/123/items/EFGH5678?page=7');
});
test('filenames are Windows safe',()=>{
  assert.equal(safeFilename('A: paper / [test]?'),'A paper test');assert.equal(safeFilename('CON'),'文献 CON');
});
