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
