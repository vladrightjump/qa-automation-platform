// Pure recommendation scoring + sort comparator — extracted from
// RecommendationsService. The service still owns the DB lookups
// (recently-viewed, same-category, collaborative joins); this module
// owns the deterministic scoring and the final ordering.
//
// Determinism matters: e2e tests pin top-N for a given seeded user, so
// any change to the score formulas or the comparator must be intentional
// and reflected in the assertions. Mutation testing catches accidental
// drift here.
import type { RecommendationKind } from './index';

export const MAX_RECOMMENDATIONS = 12;

// Score functions per signal. Higher = surfaced earlier in the response.
// Collaborative outranks same-category which outranks recently-viewed.
// recencyRank is the position of the input within its signal source
// (0 = most recent / strongest), so smaller rank → higher score.
export const SCORE = {
  collaborative: (coOccurrenceCount: number): number => 100 + coOccurrenceCount,
  sameCategory: (recencyRank: number): number => 50 - recencyRank,
  recentlyViewed: (recencyRank: number): number => 30 - recencyRank,
} as const;

export type ScoreKind = keyof typeof SCORE;

// The minimum shape the comparator needs. Keeping it loose so callers
// don't have to import the full Recommendation type just to sort.
export interface RankedItem {
  kind: RecommendationKind;
  score: number;
  product: { id: string };
}

/**
 * Sort key for the final response:
 *   1. Higher score first.
 *   2. Tie-break by `product.id` (asc, locale-insensitive) so the order
 *      is stable across runs and platforms. Tests assert against this
 *      order, so changing it is breaking.
 */
export function compareRecommendations(a: RankedItem, b: RankedItem): number {
  if (b.score !== a.score) return b.score - a.score;
  return a.product.id.localeCompare(b.product.id);
}
