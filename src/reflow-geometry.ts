import type {StructuredDocumentText} from '../vendor/structured-document-text/schema';
// @ts-ignore Native SDT character decoder has no TypeScript declaration.
import {getBlockText} from '../vendor/structured-document-text/src/pdf/block.js';
import {mergeTextRects} from './selection-geometry';

export interface SourceChar {page:number;rect:number[]|null}
export function sourceCharacters(structure:StructuredDocumentText,ref:string,index:number):SourceChar[]{
  const mapped=getBlockText(structure,[...ref.split('.').map(Number),index]);
  return mapped.rects.map((rect:number[]|null,i:number)=>({page:mapped.pageIndexes[i]===null?0:mapped.pageIndexes[i]+1,rect}));
}
export function normalizeSourceRect(rect:number[],viewport:{convertToViewportRectangle:(rect:number[])=>number[];width:number;height:number}):number[]{
  const [x1,y1,x2,y2]=viewport.convertToViewportRectangle(rect);
  return [Math.min(x1,x2)/viewport.width,Math.min(y1,y2)/viewport.height,Math.abs(x2-x1)/viewport.width,Math.abs(y2-y1)/viewport.height];
}
export function mergeSourceRects(rects:number[][]):number[][]{
  // Merge in PDF point-like units; the line merger's tolerance is in pixels.
  return mergeTextRects(rects.map(r=>r.map(v=>v*1000))).map(r=>r.map(v=>Math.max(0,Math.min(1,v/1000))));
}
export function rectContains(center:number[],rect:number[]):boolean{return center[0]>=rect[0]-.001&&center[0]<=rect[0]+rect[2]+.001&&center[1]>=rect[1]-.001&&center[1]<=rect[1]+rect[3]+.001;}
