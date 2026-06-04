import { describe, expect, it } from 'vitest';
import { buildBulkProductRows, mulberry32, pick } from './bulk-seed-rng';

describe('mulberry32', () => {
  it('same seed produces the same first 16 outputs', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 16; i += 1) {
      expect(a()).toBe(b());
    }
  });

  it('different seeds produce different streams', () => {
    const a = mulberry32(42);
    const b = mulberry32(43);
    // Compare the first 4 outputs — vanishingly unlikely to collide.
    const seqA = Array.from({ length: 4 }, () => a());
    const seqB = Array.from({ length: 4 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });

  it('output is always in [0, 1)', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 100; i += 1) {
      const n = rng();
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });

  it('pinned sequence for seed=42 (catches arithmetic-operator drift in the LCG step)', () => {
    // These exact values come from the reference Mulberry32 implementation
    // (+ 0x6d2b79f5, ^ >>> 15/7/14 shifts). Any mutation to the additive
    // constant, the shifts, or the OR mask changes the stream.
    const rng = mulberry32(42);
    expect(rng().toFixed(10)).toBe('0.6011037519');
    expect(rng().toFixed(10)).toBe('0.4482905590');
    expect(rng().toFixed(10)).toBe('0.8524657935');
    expect(rng().toFixed(10)).toBe('0.6697340414');
  });
});

describe('pick', () => {
  it('returns an element of the array', () => {
    const rng = mulberry32(1);
    const arr = ['a', 'b', 'c', 'd'] as const;
    for (let i = 0; i < 20; i += 1) {
      const v = pick(rng, arr);
      expect(arr).toContain(v);
    }
  });

  it('uses the RNG to index: same seed → same picks', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const arr = ['x', 'y', 'z'] as const;
    expect(pick(a, arr)).toBe(pick(b, arr));
  });

  it('single-element array always returns that element', () => {
    const rng = mulberry32(99);
    expect(pick(rng, ['only'] as const)).toBe('only');
  });

  it('multi-element array: 30 picks hit at least 3 distinct indices', () => {
    // Catches `rng() * arr.length` mutated to `rng() / arr.length` — the
    // divided form is always < 1 → Math.floor → 0 → only arr[0] ever picked.
    const rng = mulberry32(1);
    const arr = ['a', 'b', 'c', 'd', 'e'] as const;
    const seen = new Set<string>();
    for (let i = 0; i < 30; i += 1) seen.add(pick(rng, arr));
    expect(seen.size).toBeGreaterThanOrEqual(3);
  });
});

describe('buildBulkProductRows', () => {
  it('count=0 returns an empty array', () => {
    expect(buildBulkProductRows(0)).toEqual([]);
  });

  it('returns exactly `count` rows', () => {
    expect(buildBulkProductRows(5)).toHaveLength(5);
    expect(buildBulkProductRows(100)).toHaveLength(100);
  });

  it('IDs follow the `bulk_<seed>_<i>` pattern, indexed from 0', () => {
    const rows = buildBulkProductRows(3, 42);
    expect(rows[0]!.id).toBe('bulk_42_0');
    expect(rows[1]!.id).toBe('bulk_42_1');
    expect(rows[2]!.id).toBe('bulk_42_2');
  });

  it('different seeds produce different IDs', () => {
    const a = buildBulkProductRows(1, 1);
    const b = buildBulkProductRows(1, 2);
    expect(a[0]!.id).toBe('bulk_1_0');
    expect(b[0]!.id).toBe('bulk_2_0');
  });

  it('same (count, seed) produces byte-identical rows (idempotent)', () => {
    const a = buildBulkProductRows(10, 42);
    const b = buildBulkProductRows(10, 42);
    expect(a).toEqual(b);
  });

  it('prices fall in [500, 9999] cents ($5..$99.99)', () => {
    for (const row of buildBulkProductRows(200, 42)) {
      expect(row.priceCents).toBeGreaterThanOrEqual(500);
      expect(row.priceCents).toBeLessThanOrEqual(500 + 9499);
    }
  });

  it('stock falls in [5, 99]', () => {
    for (const row of buildBulkProductRows(200, 42)) {
      expect(row.stock).toBeGreaterThanOrEqual(5);
      expect(row.stock).toBeLessThanOrEqual(5 + 94);
    }
  });

  it('prices vary across rows (catches *9500 → /9500 mutant that pins to 500)', () => {
    const rows = buildBulkProductRows(50, 42);
    const distinct = new Set(rows.map((r) => r.priceCents));
    expect(distinct.size).toBeGreaterThan(5);
    // And there's at least one row clearly above the minimum.
    expect(Math.max(...rows.map((r) => r.priceCents))).toBeGreaterThan(1500);
  });

  it('stock varies across rows (catches *95 → /95 mutant that pins to 5)', () => {
    const rows = buildBulkProductRows(50, 42);
    const distinct = new Set(rows.map((r) => r.stock));
    expect(distinct.size).toBeGreaterThan(5);
    expect(Math.max(...rows.map((r) => r.stock))).toBeGreaterThan(20);
  });

  it('category is one of the four supported values', () => {
    const allowed = new Set(['gadgets', 'apparel', 'home', 'office']);
    for (const row of buildBulkProductRows(50, 42)) {
      expect(allowed.has(row.category)).toBe(true);
    }
  });

  it('tags include the adjective, noun, and category', () => {
    const rows = buildBulkProductRows(10, 42);
    for (const row of rows) {
      expect(row.tags).toHaveLength(3);
      expect(row.tags[2]).toBe(row.category);
      // name = "<Adjective> <noun>" → first word matches the adjective tag
      // (with the leading letter capitalised by the builder).
      const adjWordCap = row.name.split(' ')[0]!;
      expect(adjWordCap.toLowerCase()).toBe(row.tags[0]);
      expect(row.name.split(' ')[1]).toBe(row.tags[1]);
    }
  });

  it('name capitalises the first letter of the adjective', () => {
    const rows = buildBulkProductRows(20, 42);
    for (const row of rows) {
      const first = row.name[0]!;
      expect(first).toBe(first.toUpperCase());
      expect(first).not.toBe(first.toLowerCase());
    }
  });

  it('description follows the canonical template', () => {
    const rows = buildBulkProductRows(5, 42);
    for (const row of rows) {
      const [adj, noun] = row.tags;
      expect(row.description).toBe(`A ${adj} ${noun} for the discerning shopper.`);
    }
  });
});
