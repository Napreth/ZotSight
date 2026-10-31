import { Language } from '../language';
export declare class Italian extends Language {
    getAbbreviations(): readonly string[];
    getLastWord(text: string): string;
    continueInNextWord(textAfterBoundary: string): boolean;
}
