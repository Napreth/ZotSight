import test from 'node:test';
import assert from 'node:assert/strict';
import {AnnotationHistory} from '../src/annotation-history';
import type {Annotation} from '../src/model';
const a:Annotation={id:'a',attachmentId:'pdf',page:1,text:'A',comment:'',color:'#ffd400',rects:[[0,0,.1,.1]],createdAt:'2026-10-29'};
test('annotation creation, deletion, undo and redo preserve independent snapshots',()=>{
  const h=new AnnotationHistory();h.sync([]);const list=[structuredClone(a)];h.record(list);list[0].comment='Edited';h.record(list,'a',10);h.record([]);
  assert.equal(h.undo()?.[0].comment,'Edited');assert.equal(h.undo()?.[0].comment,'');assert.deepEqual(h.undo(),[]);assert.equal(h.undo(),undefined);assert.equal(h.redo()?.[0].comment,'');
  h.record([{...a,id:'b'}]);assert.equal(h.redo(),undefined);
});
test('continuous comment typing is undone together and external changes reset history',()=>{
  const h=new AnnotationHistory();h.sync([a]);h.record([{...a,comment:'A'}],'a',10);h.record([{...a,comment:'AB'}],'a',100);assert.equal(h.undo()?.[0].comment,'');assert.equal(h.redo()?.[0].comment,'AB');
  h.sync([{...a,id:'external'}]);assert.equal(h.undo(),undefined);assert.equal(h.redo(),undefined);
});
