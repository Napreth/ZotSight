import { Language } from '../language';
export declare class Finnish extends Language {
    getAbbreviations(): readonly string[];
    continueInNextWord(textAfterBoundary: string): boolean;
}
