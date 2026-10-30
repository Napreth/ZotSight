import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeTextRects} from '../src/selection-geometry';
test('selection merges word gaps and overlapping duplicate boxes into continuous lines',()=>{
  assert.deepEqual(mergeTextRects([[10,10,25,12],[37,10,25,12],[10,10,25,12],[62,10,20,12],[10,26,50,12],[62,26,20,12]]),[[10,10,72,12],[10,26,72,12]]);
});
test('selection keeps column gutters and separate lines open',()=>{
  assert.deepEqual(mergeTextRects([[10,10,60,12],[100,10,60,12],[10,26,60,12]]),[[10,10,60,12],[100,10,60,12],[10,26,60,12]]);
  assert.deepEqual(mergeTextRects([[0,0,0,0],[NaN,0,1,2]]),[]);
});
