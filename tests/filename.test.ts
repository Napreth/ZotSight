import test from 'node:test';
import assert from 'node:assert/strict';
import {fitFilename} from '../src/filename';
test('long attachment names retain their extension at narrow and wide menu widths',()=>{
  const measure=(s:string)=>Array.from(s).reduce((w,c)=>w+(/[\u4e00-\u9fff]/.test(c)?2:1),0);
  const value='用于测试超长中文附件名称的研究论文标题与双语翻译.pdf';
  for(const width of [15,25,35]){const result=fitFilename(value,width,measure);assert.match(result,/\.\.\. \.pdf$/);assert.ok(measure(result)<=width);}
  assert.equal(fitFilename('Preprint PDF',20,measure),'Preprint PDF');assert.equal(fitFilename('No extension attachment',15,measure),'No extension...');
});
