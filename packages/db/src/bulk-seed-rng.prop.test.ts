import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import { buildBulkProductRows, mulberry32, pick } from './bulk-seed-rng';

const ALLOWED_CATEGORIES = new Set(['gadgets', 'apparel', 'home', 'office']);

const seedArb = fc.integer({ min: 0, max: 2_147_483_647 });

describe('mulberry32 — properties', () => {
  it('output is always in [0, 1) for any seed across the first 32 calls', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const rng = mulberry32(seed);
        for (let i = 0; i < 32; i += 1) {
          const n = rng();
          if (!(n >= 0 && n < 1)) return false;
        }
        return true;
      }),
    );
  });

  it('determinism: same seed → identical first 16 outputs', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const a = mulberry32(seed);
        const b = mulberry32(seed);
        for (let i = 0; i < 16; i += 1) {
          if (a() !== b()) return false;
        }
        return true;
      }),
    );
  });
});

describe('pick — properties', () => {
  it('always returns an element of the input array (any seed × any non-empty array)', () => {
    fc.assert(
      fc.property(
        seedArb,
        fc.array(fc.string(), { minLength: 1, maxLength: 10 }),
        (seed, arr) => {
          const rng = mulberry32(seed);
          for (let i = 0; i < 20; i += 1) {
            const v = pick(rng, arr);
            if (!arr.includes(v)) return false;
          }
          return true;
        },
      ),
    );
  });
});

describe('buildBulkProductRows — properties', () => {
  const countArb = fc.integer({ min: 0, max: 100 });

  it('returns exactly `count` rows', () => {
    fc.assert(
      fc.property(countArb, seedArb, (count, seed) => {
        return buildBulkProductRows(count, seed).length === count;
      }),
    );
  });

  it('IDs are unique within a single call', () => {
    fc.assert(
      fc.property(countArb, seedArb, (count, seed) => {
        const ids = buildBulkProductRows(count, seed).map((r) => r.id);
        return new Set(ids).size === ids.length;
      }),
    );
  });

  it('IDs follow the `bulk_<seed>_<i>` template', () => {
    fc.assert(
      fc.property(countArb, seedArb, (count, seed) => {
        const rows = buildBulkProductRows(count, seed);
        return rows.every((r, i) => r.id === `bulk_${seed}_${i}`);
      }),
    );
  });

  it('prices fall in [500, 9999] cents and stock in [5, 99] for every row', () => {
    fc.assert(
      fc.property(countArb, seedArb, (count, seed) => {
        for (const row of buildBulkProductRows(count, seed)) {
          if (row.priceCents < 500 || row.priceCents > 9999) return false;
          if (row.stock < 5 || row.stock > 99) return false;
        }
        return true;
      }),
    );
  });

  it('category is one of the four canonical values for every row', () => {
    fc.assert(
      fc.property(countArb, seedArb, (count, seed) => {
        for (const row of buildBulkProductRows(count, seed)) {
          if (!ALLOWED_CATEGORIES.has(row.category)) return false;
        }
        return true;
      }),
    );
  });

  it('idempotent: same (count, seed) produces deep-equal rows', () => {
    fc.assert(
      fc.property(countArb, seedArb, (count, seed) => {
        expect(buildBulkProductRows(count, seed)).toEqual(
          buildBulkProductRows(count, seed),
        );
        return true;
      }),
    );
  });
});
