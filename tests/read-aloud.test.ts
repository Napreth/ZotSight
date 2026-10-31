import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSDTReadAloudSegments} from '../vendor/zotero-reader/common/read-aloud/sdt-segments';
import {speechDocument} from '../src/speech-document';
import type {StructuredDocumentText} from '../vendor/structured-document-text/schema';
import type {ReadingTranslation} from '../src/reading-api';

const fixture=()=>({schemaVersion:'1.2.0',metadata:{processor:{type:'pdf',version:14},source:{hash:'test',contentType:'application/pdf',properties:{Language:'en'}},dateCreated:'2026-10-31'},catalog:{outline:[],pages:[]},content:[{type:'paragraph',content:[{text:'This is a sentence. Another follows.'}],anchor:{}},{type:'paragraph',flowClass:'excluded',content:[{text:'HEADER DO NOT READ'}],anchor:{}},{type:'math',content:[],anchor:{}}]}) as unknown as StructuredDocumentText;
test('Zotero native speech segmentation splits sentences and skips excluded headers',()=>{const segments=buildSDTReadAloudSegments(fixture(),'sentence','en').segments;assert.deepEqual(segments.map(s=>s.text),['This is a sentence.','Another follows.']);assert.ok(segments.every(s=>s.position.start.length>=2));});
test('speaking a reading translation changes its speech text without modifying the original structure',()=>{const source=fixture();const translation={targetLanguage:'zh-CN',units:[{ref:'0',parts:[{text:'这是译文。'}]}]} as ReadingTranslation;const output=speechDocument(source,translation);assert.equal((source.content[0].content as any)[0].text,'This is a sentence. Another follows.');assert.equal(getText(output),'这是译文。');assert.equal(output.metadata.source.properties?.Language,'zh-CN');});
function getText(source:StructuredDocumentText){return (source.content[0].content as any)[0].text;}
