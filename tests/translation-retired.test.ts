import test from 'node:test';
import assert from 'node:assert/strict';
import {Pipeline} from '../src/modules/document-translation/pipeline';
import {storedRoute,ROUTES,type Job} from '../src/modules/document-translation/types';

test('retired experimental task metadata remains readable without an executable route',async()=>{
  assert.equal(storedRoute('template'),true);assert.equal(Object.hasOwn(ROUTES,'template'),false);assert.equal(storedRoute('unknown'),false);
  const pipeline=new Pipeline({} as any,{} as any);let ran=false;(pipeline as any).runRoute=async()=>{ran=true;};
  await assert.rejects(pipeline.run({route:'template'} as Job,new AbortController().signal),/ZSTranslate/);assert.equal(ran,false);
});
