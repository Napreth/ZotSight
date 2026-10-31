import test from 'node:test';
import assert from 'node:assert/strict';
import {newSeed} from '../src/model';
import {seedViewUpdate} from '../src/view-update';

function fixture(){
  const seed=newSeed('Paper');
  seed.attachments=[{id:'original',kind:'vault' as const,path:'paper.pdf',title:'Original'}];
  seed.reader.attachmentId='original';
  return seed;
}

test('background note, metadata and reading-state saves preserve the loaded document',()=>{
  const previous=fixture(),next=structuredClone(previous);
  next.note='Updated in another window';next.metadata.year='2027';next.updatedAt='2026-10-30';
  next.reader.page=3;next.reader.zoom=1.5;next.reader.reading={mode:'reflow',y:.4};
  const update=seedViewUpdate(previous,next,false);
  assert.equal(update.rebuild,false);assert.equal(update.document,false);
  assert.equal(update.note,true);assert.equal(update.metadata,true);
});

test('adding a translated attachment or changing its label only updates the menu',()=>{
  const previous=fixture(),next=structuredClone(previous);
  next.attachments[0].title='Renamed original';
  next.attachments.push({id:'translation',kind:'vault',path:'translation.pdf',title:'Translation'});
  const update=seedViewUpdate(previous,next,false);
  assert.equal(update.attachments,true);assert.equal(update.document,false);assert.equal(update.rebuild,false);
});

test('switching the PDF identity reloads the document while clearing rebuilds the view',()=>{
  const previous=fixture(),next=structuredClone(previous);next.attachments[0].path='replacement.pdf';
  assert.equal(seedViewUpdate(previous,next,false).document,true);
  assert.equal(seedViewUpdate(previous,next,false).rebuild,false);
  assert.equal(seedViewUpdate(previous,previous,true).rebuild,true);
  assert.equal(seedViewUpdate(null,previous,false).rebuild,true);
});

test('Zotero library identity affects Zotero attachments and leaves vault PDFs intact',()=>{
  const previous=fixture(),next=structuredClone(previous);
  next.source={provider:'zotero',libraryType:'user',libraryId:'12',itemKey:'ABCD1234'};
  assert.equal(seedViewUpdate(previous,next,false).document,false);
  previous.attachments[0].kind=next.attachments[0].kind='zotero';
  previous.attachments[0].key=next.attachments[0].key='EFGH5678';
  assert.equal(seedViewUpdate(previous,next,false).document,true);
});

test('source property order and auxiliary metadata do not reopen a Zotero attachment',()=>{
  const previous=fixture(),next=structuredClone(previous);
  previous.attachments[0].kind=next.attachments[0].kind='zotero';
  previous.source={provider:'zotero',libraryType:'user',libraryId:'12',itemKey:'ABCD1234'};
  next.source={itemKey:'ABCD1234',libraryId:'12',libraryType:'user',provider:'zotero'};
  Object.assign(next.source,{lastSynced:'2026-10-30'});
  assert.equal(seedViewUpdate(previous,next,false).document,false);
});
