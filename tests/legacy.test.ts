import test from 'node:test';
import assert from 'node:assert/strict';
import { legacyProxySource, isUnchangedLegacyProxy } from '../src/legacy';
import { newSeed } from '../src/model';
const seed=newSeed('Paper');seed.note='# Notes\n\n[[Research]]';
const path='文献/Paper.zsseed';
const proxy='---\nzotsight-source: "文献/Paper.zsseed"\ntags: [zotsight]\n---\n\n# Paper\n\n[[文献/Paper.zsseed|打开文献]]\n\n# Notes\n\n[[Research]]\n';
test('legacy migration recognizes only the exact generated marker',()=>{
  assert.equal(legacyProxySource(proxy),path);assert.equal(legacyProxySource(proxy.replace(/\n/g,'\r\n')),path);
  assert.equal(legacyProxySource('# My research notes'),null);assert.equal(legacyProxySource(proxy.replace('[zotsight]','[research]')),null);assert.equal(legacyProxySource(proxy.replace('Paper.zsseed','Paper.md')),null);
});
test('unchanged legacy copies can be recycled',()=>{
  assert.equal(isUnchangedLegacyProxy(proxy,path,seed),true);assert.equal(isUnchangedLegacyProxy(proxy.replace(/\n/g,'\r\n'),path,seed),true);
  const windows=structuredClone(seed);windows.note=windows.note.replace(/\n/g,'\r\n');assert.equal(isUnchangedLegacyProxy(proxy,path,windows),true);
});
test('modified copies and stale notes are preserved',()=>{
  assert.equal(isUnchangedLegacyProxy(proxy+'My unique comments',path,seed),false);
  const changed=structuredClone(seed);changed.note='Newer note';assert.equal(isUnchangedLegacyProxy(proxy,path,changed),false);
  assert.equal(isUnchangedLegacyProxy(proxy.replace('# Paper','# Different title'),path,seed),false);
});
