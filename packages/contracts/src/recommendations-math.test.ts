import { describe, expect, it } from 'vitest';
import {
  MAX_RECOMMENDATIONS,
  SCORE,
  compareRecommendations,
  type RankedItem,
} from './recommendations-math';

describe('MAX_RECOMMENDATIONS', () => {
  it('is 12 (cap on the response array)', () => {
    expect(MAX_RECOMMENDATIONS).toBe(12);
  });
});

describe('SCORE.collaborative', () => {
  it('base score 100 with zero co-occurrences', () => {
    expect(SCORE.collaborative(0)).toBe(100);
  });

  it('increases monotonically with co-occurrence count', () => {
    expect(SCORE.collaborative(1)).toBe(101);
    expect(SCORE.collaborative(5)).toBe(105);
  });

  it('always outranks the strongest same-category score', () => {
    // Strongest same-category (rank 0) = 50; collaborative base = 100.
    expect(SCORE.collaborative(0)).toBeGreaterThan(SCORE.sameCategory(0));
  });
});

describe('SCORE.sameCategory', () => {
  it('base score 50 at recency rank 0', () => {
    expect(SCORE.sameCategory(0)).toBe(50);
  });

  it('decreases monotonically as recency rank grows', () => {
    expect(SCORE.sameCategory(1)).toBe(49);
    expect(SCORE.sameCategory(10)).toBe(40);
  });

  it('always outranks the strongest recently-viewed score', () => {
    expect(SCORE.sameCategory(0)).toBeGreaterThan(SCORE.recentlyViewed(0));
  });
});

describe('SCORE.recentlyViewed', () => {
  it('base score 30 at recency rank 0', () => {
    expect(SCORE.recentlyViewed(0)).toBe(30);
  });

  it('decreases monotonically as recency rank grows', () => {
    expect(SCORE.recentlyViewed(1)).toBe(29);
    expect(SCORE.recentlyViewed(10)).toBe(20);
  });
});

describe('compareRecommendations', () => {
  function item(
    score: number,
    id: string,
    kind: RankedItem['kind'] = 'same-category',
  ): RankedItem {
    return { kind, score, product: { id } };
  }

  it('higher score sorts first (negative result)', () => {
    expect(compareRecommendations(item(50, 'a'), item(30, 'b'))).toBeLessThan(0);
  });

  it('lower score sorts last (positive result)', () => {
    expect(compareRecommendations(item(30, 'a'), item(50, 'b'))).toBeGreaterThan(0);
  });

  it('equal scores: tie-break by product.id ascending', () => {
    expect(compareRecommendations(item(40, 'a'), item(40, 'b'))).toBeLessThan(0);
    expect(compareRecommendations(item(40, 'b'), item(40, 'a'))).toBeGreaterThan(0);
  });

  it('identical items return 0 (stable)', () => {
    expect(compareRecommendations(item(40, 'a'), item(40, 'a'))).toBe(0);
  });

  it('full sort produces a deterministic order', () => {
    const items: RankedItem[] = [
      item(30, 'z', 'recently-viewed'),
      item(50, 'b'),
      item(50, 'a'),
      item(100, 'c', 'collaborative'),
    ];
    const sorted = [...items].sort(compareRecommendations);
    expect(sorted.map((r) => r.product.id)).toEqual(['c', 'a', 'b', 'z']);
  });
});
