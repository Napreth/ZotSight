export type SDTPosition={start:number[];end:number[]};
export type ReadAloudGranularity='paragraph'|'sentence'|'word';
export interface ReadAloudSegment {position:SDTPosition;text:string;granularity:ReadAloudGranularity;anchor:'paragraphStart'|null;sourcePosition?:unknown;paragraphSourcePosition?:unknown}

export type SourcePosition=unknown;
export type AnnotationType=string;
