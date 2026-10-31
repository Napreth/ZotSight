import { Language } from '../language';
export declare class Russian extends Language {
    getAbbreviations(): readonly string[];
    continueInNextWord(textAfterBoundary: string): boolean;
}
