import {flattenOutline,structureOutline,outlineText,type OutlineTranslation} from '../../outline';
import type {ReadingTranslation} from '../../reading-api';
import type {StructuredDocumentText} from '../../../vendor/structured-document-text/schema';
import type {TranslationEngine} from './engine';
export function restoreOutline(structure:StructuredDocumentText,units:ReadingTranslation['units']):OutlineTranslation[]{const results=new Map(units.map(u=>[u.ref,u.parts.map(p=>p.text).join('')]));return flattenOutline(structureOutline(structure)).map(item=>({key:item.key,source:item.title,title:item.ref&&results.get(item.ref)||item.title,ref:item.ref,page:item.page,sourcePageCount:structure.catalog.pages.length}));}
export async function translateOutline(structure:StructuredDocumentText,engine:Pick<TranslationEngine,'translateText'>,units:ReadingTranslation['units']=[]):Promise<OutlineTranslation[]>{const entries=restoreOutline(structure,units);for(const entry of entries)if(outlineText(entry.source)===outlineText(entry.title))entry.title=await engine.translateText(entry.source);return entries;}
