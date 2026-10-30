import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceCharacters,normalizeSourceRect,mergeSourceRects} from '../src/reflow-geometry';
import {readingSettings} from '../src/reflow';
import {newSeed,parseSeed,serializeSeed} from '../src/model';
import type {StructuredDocumentText} from '../vendor/structured-document-text/schema';

test('native SDT geometry maps spaces, styled nodes and page boundaries to source characters',()=>{
  const structure={content:[{type:'paragraph',content:[{text:'A B\nC',anchor:{textMap:'[[0,0,10,70,30,80,10,10],[0,1,20,40,30,50]]'}}]}]} as unknown as StructuredDocumentText;
  const chars=sourceCharacters(structure,'0',0);
  assert.deepEqual(chars,[{page:1,rect:[10,70,20,80]},{page:0,rect:null},{page:1,rect:[20,70,30,80]},{page:0,rect:null},{page:2,rect:[20,40,30,50]}]);
});
test('source rectangles use the PDF viewport transform, including rotated pages',()=>{
  assert.deepEqual(normalizeSourceRect([10,70,30,80],{width:100,height:100,convertToViewportRectangle:([x1,y1,x2,y2])=>[x1,100-y1,x2,100-y2]}),[.1,.2,.2,.1]);
  assert.deepEqual(normalizeSourceRect([10,70,30,80],{width:100,height:100,convertToViewportRectangle:([x1,y1,x2,y2])=>[y1,x1,y2,x2]}),[.7,.1,.1,.2]);
  assert.deepEqual(mergeSourceRects([[.1,.2,.01,.02],[.112,.2,.012,.02],[.6,.2,.01,.02]]),[[.1,.2,.024,.02],[.6,.2,.01,.02]]);
});
test('reading preferences are bounded and survive the existing seed format',()=>{
  const seed=newSeed();seed.reader.reading=readingSettings({mode:'reflow',font:'sans',size:80,lineHeight:9,y:-10,x:.6});
  assert.deepEqual(parseSeed(serializeSeed(seed)).reader.reading,{mode:'reflow',font:'sans',size:32,lineHeight:2.2,y:0,x:.6});
  assert.equal(readingSettings({mode:'wrong'}).mode,'pdf');assert.equal(readingSettings(null).size,20);
});
