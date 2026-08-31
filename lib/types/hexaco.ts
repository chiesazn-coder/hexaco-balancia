export type Response = Record<number, number>;

export interface FacetScore {
  name: string;
  mean: number;
  zScore: number;
  category: string;
}

export interface DomainScore {
  name: string;
  mean: number;
  zScore: number;
  category: string;
  facets: FacetScore[];
}

export interface HexacoResult {
  domains: DomainScore[];
  altruism: FacetScore;
  completedAt: string;
}

export interface Question {
  id: number;
  text: string;
  reverse: boolean;
}

export interface ScoreItem {
  id: number;
  r: boolean;
}

export type ScoringKey = Record<string, Record<string, ScoreItem[]>>;
