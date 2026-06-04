import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import {
  SCORE,
  compareRecommendations,
  type RankedItem,
} from './recommendations-math';

const kindArb = fc.constantFrom(
  'collaborative',
  'same-category',
  'recently-viewed',
) as fc.Arbitrary<RankedItem['kind']>;

const itemArb: fc.Arbitrary<RankedItem> = fc.record({
  kind: kindArb,
  score: fc.integer({ min: -1000, max: 1000 }),
  product: fc.record({ id: fc.string({ minLength: 1, maxLength: 16 }) }),
});

function sign(n: number): number {
  if (n > 0) return 1;
  if (n < 0) return -1;
  return 0;
}

describe('compareRecommendations — properties', () => {
  it('antisymmetry: sign(cmp(a, b)) === -sign(cmp(b, a)) for distinct items', () => {
    fc.assert(
      fc.property(itemArb, itemArb, (a, b) => {
        fc.pre(a.score !== b.score || a.product.id !== b.product.id);
        return sign(compareRecommendations(a, b)) ===
          -sign(compareRecommendations(b, a));
      }),
    );
  });

  it('reflexivity: cmp(a, a) === 0', () => {
    fc.assert(
      fc.property(itemArb, (a) => compareRecommendations(a, a) === 0),
    );
  });

  it('transitivity: cmp(a,b) ≤ 0 ∧ cmp(b,c) ≤ 0 → cmp(a,c) ≤ 0', () => {
    fc.assert(
      fc.property(itemArb, itemArb, itemArb, (a, b, c) => {
        if (
          compareRecommendations(a, b) <= 0 &&
          compareRecommendations(b, c) <= 0
        ) {
          return compareRecommendations(a, c) <= 0;
        }
        return true;
      }),
    );
  });

  it('sort: result is ordered by (score desc, then product.id via localeCompare asc)', () => {
    // Tie-break uses `localeCompare` (not raw `<`/`>`) so the property has
    // to mirror that. ASCII punctuation can reorder under locale rules —
    // caught by fast-check the first time this property was authored.
    fc.assert(
      fc.property(fc.array(itemArb, { maxLength: 20 }), (items) => {
        const sorted = [...items].sort(compareRecommendations);
        for (let i = 0; i + 1 < sorted.length; i += 1) {
          const a = sorted[i]!;
          const b = sorted[i + 1]!;
          if (a.score < b.score) return false;
          if (
            a.score === b.score &&
            a.product.id.localeCompare(b.product.id) > 0
          )
            return false;
        }
        return true;
      }),
    );
  });
});

describe('SCORE — properties', () => {
  it('collaborative is strictly monotonic in coOccurrenceCount', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 10_000 }),
        fc.nat({ max: 10_000 }),
        (a, b) => {
          if (a === b) return true;
          const cmp = a < b ? -1 : 1;
          return Math.sign(SCORE.collaborative(a) - SCORE.collaborative(b)) === cmp;
        },
      ),
    );
  });

  it('sameCategory is strictly decreasing in recency rank', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 100 }),
        fc.nat({ max: 100 }),
        (a, b) => {
          if (a === b) return true;
          const cmp = a < b ? 1 : -1;
          return Math.sign(SCORE.sameCategory(a) - SCORE.sameCategory(b)) === cmp;
        },
      ),
    );
  });

  it('collaborative outranks same-category outranks recently-viewed at their best (rank 0)', () => {
    expect(SCORE.collaborative(0)).toBeGreaterThan(SCORE.sameCategory(0));
    expect(SCORE.sameCategory(0)).toBeGreaterThan(SCORE.recentlyViewed(0));
  });
});
