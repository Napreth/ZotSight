export interface SentenceBoundary {
    startIndex: number;
    endIndex: number;
    text: string;
    boundarySymbol: string | null;
    isParagraphBreak: boolean;
}
export declare enum SkippableRangeType {
    Quote = "Quote",
    Parentheses = "Parentheses",
    Email = "Email"
}
export interface SkippableRange {
    start: number;
    end: number;
    rangeType: SkippableRangeType;
}
export declare function parseAbbreviations(...texts: string[]): string[];
export declare abstract class Language {
    abstract getAbbreviations(): readonly string[];
    getAbbreviationChar(): string;
    getSentenceBreakRegex(): RegExp;
    getSentenceBoundaries(text: string): SentenceBoundary[];
    segment(text: string): string[];
    getBoundaryExtend(word: string): number;
    isAbbreviation(head: string, _tail: string, separator: string): boolean;
    getLastWord(text: string): string;
    isExclamation(head: string, _tail: string): boolean;
    getNextWordApprox(text: string, start: number): string;
    findBoundary(text: string, start: number, end: number): number | null;
    continueInNextWord(textAfterBoundary: string): boolean;
    getSkippableRanges(text: string): SkippableRange[];
}
