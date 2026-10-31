import { Language } from '../language';
export declare class Greek extends Language {
    getAbbreviations(): readonly string[];
    getSentenceBreakRegex(): RegExp;
}
