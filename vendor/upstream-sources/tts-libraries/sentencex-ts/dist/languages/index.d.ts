import { Language } from '../language';
export type LanguageConstructor = new () => Language;
export declare const LANGUAGE_REGISTRY: Map<string, LanguageConstructor>;
