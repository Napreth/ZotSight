import type {TranslationUnit} from './types';
import type {StructuredDocumentText} from '../../../vendor/structured-document-text/schema';

const immutable=(node:any)=>!!(node.refs?.length||node.target||node.style?.monospace||node.style?.sup||node.style?.sub||(node.style?.italic&&node.text.trim().length<4));
export function documentUnits(structure:StructuredDocumentText):TranslationUnit[]{
  const units:TranslationUnit[]=[];
  function visit(block:any,ref:string):void{
    if(block.reference||block.flowClass==='excluded'||['image','math','preformatted'].includes(block.type))return;
    if(Array.isArray(block.content)&&block.content.length&&block.content.every((n:any)=>typeof n.text==='string')){
      const protectedParts:TranslationUnit['protected']=[];let text='';
      for(const [index,node] of block.content.entries()){
        if(immutable(node)&&node.text.trim()){const token=`⟦ZS${protectedParts.length}⟧`;protectedParts.push({token,text:node.text,sourceIndex:index});text+=token;}else text+=node.text;
      }
      if(/[\p{L}]/u.test(text.replace(/⟦ZS\d+⟧/g,'')))units.push({id:ref,ref,text,protected:protectedParts,page:(block.anchor?.pageRects?.[0]?.[0]??0)+1});
      return;
    }
    for(const [i,child] of (block.content||[]).entries())visit(child,`${ref}.${i}`);
  }
  structure.content.forEach((block,index)=>visit(block,String(index)));return units;
}
export function protectText(text:string):TranslationUnit{
  const protectedParts:TranslationUnit['protected']=[];
  // Backend formula placeholders, links, TeX commands and inline mathematics are immutable.
  const result=text.replace(/(?:⟦ZS\d+⟧|\{v\d+\}|<\/?(?:b|v|x|ph)\d+(?:\s[^>]*)?>|<style\s+id=['"]\d+['"]>|<\/style>|https?:\/\/[^\s<>]+|\\\([\s\S]*?\\\)|\$[^$\n]+\$)/g,value=>{const token=`⟦ZS${protectedParts.length}⟧`;protectedParts.push({token,text:value});return token;});
  return {id:'text',text:result,protected:protectedParts};
}
export function normalizeTokens(text:string):string{return text.replace(/[⟦\[]\s*[Zz][Ss]\s*(\d+)\s*[⟧\]]/g,(_,index)=>`⟦ZS${index}⟧`);}
export function validateTranslation(unit:TranslationUnit,value:string):string{
  const text=normalizeTokens(value).trim();if(!text)throw Error('翻译服务返回了空译文。');
  const found=text.match(/⟦ZS\d+⟧/g)||[];if(found.length!==unit.protected.length||unit.protected.some(p=>found.filter(t=>t===p.token).length!==1))throw Error('译文改变或遗漏了公式、引用占位符，请重试或更换翻译服务。');if(unit.preserveOrder&&found.join('|')!==(unit.text.match(/⟦ZS\d+⟧/g)||[]).join('|'))throw Error('译文改变了 LaTeX 结构标记的顺序。');return text;
}
export function parts(unit:TranslationUnit,text:string):{text:string;sourceIndex?:number}[]{
  const result:{text:string;sourceIndex?:number}[]=[];let position=0;for(const match of text.matchAll(/⟦ZS\d+⟧/g)){if(match.index!>position)result.push({text:text.slice(position,match.index)});const original=unit.protected.find(p=>p.token===match[0]);if(!original)throw Error('未知的翻译占位符。');result.push({text:original.text,...(original.sourceIndex===undefined?{}:{sourceIndex:original.sourceIndex})});position=match.index!+match[0].length;}if(position<text.length)result.push({text:text.slice(position)});return result;
}
export function restore(unit:TranslationUnit,text:string):string{return parts(unit,text).map(p=>p.text).join('');}
