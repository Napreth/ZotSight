import { Language } from '../language';
export declare class Slovak extends Language {
    getAbbreviations(): readonly string[];
    continueInNextWord(textAfterBoundary: string): boolean;
}
