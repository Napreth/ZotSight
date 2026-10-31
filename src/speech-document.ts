import type {StructuredDocumentText} from '../vendor/structured-document-text/schema';
import type {ReadingTranslation} from './reading-api';

/** Read the selected language while retaining native citation and reference markers. */
export function speechDocument(source:StructuredDocumentText,translation:ReadingTranslation|null):StructuredDocumentText{
  if(!translation)return source;const result=structuredClone(source);
  for(const unit of translation.units){let block:any={content:result.content};for(const index of unit.ref.split('.').map(Number))block=block?.content?.[index];if(!Array.isArray(block?.content))continue;const original=block.content;block.content=unit.parts.map(part=>part.sourceIndex===undefined?{text:part.text}:({...original[part.sourceIndex],text:part.text}));}
  result.metadata.source.properties={...result.metadata.source.properties,Language:translation.targetLanguage,language:translation.targetLanguage};return result;
}
