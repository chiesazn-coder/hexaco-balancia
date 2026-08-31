export type HexacoDomain = "H" | "E" | "X" | "A" | "C" | "O";
export type ResponseValue = 1 | 2 | 3 | 4 | 5;
export interface Question { id: number; text: string; reverse: boolean; }
export type Answers = Record<number, ResponseValue>;
export interface DomainScore { raw: number; mean: number; percentile: number; answered: number; }
export type HexacoResult = Record<HexacoDomain, DomainScore>;
export interface ScoreItem { id: number; r: boolean; }
export type ScoringKey = Record<string, Record<string, ScoreItem[]>>;
