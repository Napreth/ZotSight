import test from 'node:test';
import assert from 'node:assert/strict';
import {applyNoteLinkUpdates} from '../src/link-updates';
test('rename updates use Markdown offsets without touching adjacent note content',()=>{
  const note='Before [[A.zsseed|A]] and [[B.zsseed]]. After';
  const ref=(original:string)=>({original,position:{start:{offset:note.indexOf(original)},end:{offset:note.indexOf(original)+original.length}}});
  assert.equal(applyNoteLinkUpdates(note,[{reference:ref('[[A.zsseed|A]]'),change:'[[Long new title.zsseed|A]]'},{reference:ref('[[B.zsseed]]'),change:'[[New B.zsseed]]'}]),'Before [[Long new title.zsseed|A]] and [[New B.zsseed]]. After');
  assert.equal(applyNoteLinkUpdates('Someone has edited this note',[{reference:ref('[[A.zsseed|A]]'),change:'[[New]]'}]),'Someone has edited this note');
});
test('property link renames preserve YAML formatting and leave body literals intact',()=>{
  const note='---\r\nreferences:\r\n - "[[A.zsseed|A]]"\r\n---\r\n\r\n`[[A.zsseed|A]]`';
  assert.equal(applyNoteLinkUpdates(note,[{reference:{original:'[[A.zsseed|A]]'},change:'[[New.zsseed|A]]'}]),note.replace('"[[A.zsseed|A]]"','"[[New.zsseed|A]]"'));
});
