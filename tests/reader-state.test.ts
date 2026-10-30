import test from 'node:test';
import assert from 'node:assert/strict';
import { matchOffsets, normalizePDFText, pageAtOffset } from '../src/reader-state';
import { newSeed, parseSeed, serializeSeed } from '../src/model';
test('PDF search tolerates line breaks, split Chinese glyphs and ligatures',()=>{
  assert.equal(normalizePDFText('Ｍｕｌｔｉ\n agent\u00ad ﬂow'),'multiagentflow');
  assert.deepEqual(matchOffsets('多 智 能\n体 系 统','多智能体'),[0]);assert.deepEqual(matchOffsets('多\u0001智能体','多智能体'),[0]);assert.deepEqual(matchOffsets('Agent\nSystems and agent systems','agent systems'),[0,15]);assert.deepEqual(matchOffsets('Paper',''),[]);
});
test('continuous scroll identifies the current page at document boundaries',()=>{
  assert.equal(pageAtOffset([20,842,1664],0,700),1);assert.equal(pageAtOffset([20,842,1664],900,700),2);assert.equal(pageAtOffset([20,842,1664],1750,700),3);assert.equal(pageAtOffset([],0,700),1);
});
test('new annotation types and wider zoom range survive seed persistence',()=>{
  const seed=newSeed();seed.reader.zoom=4;seed.annotations=['underline','note','area'].map((type,i)=>({id:String(i),attachmentId:'pdf',page:1,text:'',comment:'Comment',color:'#2ea8e5',type:type as 'underline'|'note'|'area',rects:[[.1,.2,.3,.1]],createdAt:seed.createdAt}));assert.deepEqual(parseSeed(serializeSeed(seed)),seed);
});
