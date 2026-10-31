import { Language } from '../language';
export declare class Catalan extends Language {
    getAbbreviations(): readonly string[];
    continueInNextWord(textAfterBoundary: string): boolean;
}
