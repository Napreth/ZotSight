import type {StructuredDocumentText} from '../vendor/structured-document-text/schema';

export interface ReadingDocument {
  attachmentId:string;
  sourceHash:string;
  structure:StructuredDocumentText;
  pdf:Uint8Array;
}
export interface ReadingTranslationPart {text:string;sourceIndex?:number}
export interface ReadingTranslation {
  id:string;
  path:string;
  attachmentId:string;
  sourceHash:string;
  title:string;
  targetLanguage:string;
  units:{ref:string;parts:ReadingTranslationPart[]}[];
}

/** Keep native part-chain wrappers, image crops and reference links intact. */
export function applyReadingTranslation(article:HTMLElement,translation:ReadingTranslation):void{
  const groups=new Map<string,HTMLElement[]>();
  for(const span of article.querySelectorAll<HTMLElement>('[data-text-index]')){
    if(span.closest('[hidden]'))continue;
    const ref=span.closest<HTMLElement>('[data-ref-path]')?.dataset.refPath;
    if(ref){const group=groups.get(ref)||[];group.push(span);groups.set(ref,group);}
  }
  for(const unit of translation.units){
    const spans=groups.get(unit.ref);if(!spans?.length)continue;
    const originals=new Map(spans.map(span=>[Number(span.dataset.textIndex),span.cloneNode(true)]));
    const translated=article.ownerDocument.createElement('span');translated.dataset.translatedRef=unit.ref;translated.lang=translation.targetLanguage;
    for(const part of unit.parts){const original=part.sourceIndex===undefined?undefined:originals.get(part.sourceIndex);translated.append(original?original.cloneNode(true):article.ownerDocument.createTextNode(part.text));}
    spans[0].replaceWith(translated);for(const span of spans.slice(1))span.remove();
  }
}
