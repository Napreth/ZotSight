import { Language } from '../language';
export declare class Danish extends Language {
    getAbbreviations(): readonly string[];
    continueInNextWord(textAfterBoundary: string): boolean;
}
