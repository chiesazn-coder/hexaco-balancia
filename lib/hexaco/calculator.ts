import type { DomainScore, FacetScore, HexacoResult, Response } from "@/lib/types/hexaco";
import { NORMS } from "./norms";
import { SCORING_KEY } from "./scoringKey";

interface ScoringItem {
  id: number;
  r: boolean;
}

type DomainFacets = Record<string, ScoringItem[]>;

export function reverseScore(val: number): number {
  return 6 - val;
}

export function getCategory(zScore: number): string {
  if (zScore < -1.28) return "Sangat Rendah";
  if (zScore < -0.52) return "Rendah";
  if (zScore < 0.52) return "Sedang";
  if (zScore < 1.28) return "Tinggi";
  return "Sangat Tinggi";
}

function getResponse(item: ScoringItem, responses: Response): number {
  const value = responses[item.id];
  if (!Number.isFinite(value) || value < 1 || value > 5) {
    throw new Error(`Jawaban item ${item.id} harus berupa angka 1–5.`);
  }
  return item.r ? reverseScore(value) : value;
}

export function calculateFacetScore(facetItems: ScoringItem[], responses: Response): number {
  if (facetItems.length !== 4) throw new Error("Setiap facet HEXACO harus memiliki 4 item.");
  return facetItems.reduce((total, item) => total + getResponse(item, responses), 0) / 4;
}

export function calculateDomainScore(domainFacets: DomainFacets, responses: Response): number {
  const items = Object.values(domainFacets).flat();
  if (items.length !== 16) throw new Error("Setiap domain HEXACO harus memiliki 16 item.");
  return items.reduce((total, item) => total + getResponse(item, responses), 0) / 16;
}

function toZScore(mean: number, scaleName: string): number {
  const norm = NORMS[scaleName];
  if (!norm) throw new Error(`Norma untuk ${scaleName} tidak ditemukan.`);
  return (mean - norm.mean) / norm.sd;
}

function buildFacet(name: string, items: ScoringItem[], responses: Response): FacetScore {
  const mean = calculateFacetScore(items, responses);
  const zScore = toZScore(mean, name);
  return { name, mean, zScore, category: getCategory(zScore) };
}

export function calculateAll(responses: Response): HexacoResult {
  const domains: DomainScore[] = Object.entries(SCORING_KEY)
    .filter(([domainName]) => domainName !== "Altruism")
    .map(([name, facets]) => {
      const mean = calculateDomainScore(facets, responses);
      const zScore = toZScore(mean, name);
      return {
        name,
        mean,
        zScore,
        category: getCategory(zScore),
        facets: Object.entries(facets).map(([facetName, items]) => buildFacet(facetName, items, responses)),
      };
    });

  const altruismItems = SCORING_KEY.Altruism.Altruism;
  return {
    domains,
    altruism: buildFacet("Altruism", altruismItems, responses),
    completedAt: new Date().toISOString(),
  };
}

// Alias untuk pemanggil lama.
export const calculateScores = calculateAll;
