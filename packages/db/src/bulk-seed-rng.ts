// Pure RNG + bulk-product row builder for the perf-seed seam.
// Lives apart from seed-helpers.ts (which talks to Prisma) so the
// unit + Stryker suites can target only the deterministic logic.
//
// Determinism matters: `seedBulkProducts(client, count, rngSeed)`
// re-runs the same (count, rngSeed) and skips duplicate primary keys.
// Same row shape every time → same IDs → idempotent seed.

// Sample data — the specific words don't matter; the bulk seed only needs
// any non-empty stable set so deterministic per-seed IDs round-trip. We
// skip mutation testing on the literal contents (Stryker mutating "lamp"
// to "" wouldn't catch a real bug), but the arithmetic that consumes them
// is still mutation-tested below.
// Stryker disable all
const ADJECTIVES = [
  'compact', 'rugged', 'sleek', 'modular', 'silent', 'bright', 'cosmic',
  'minimal', 'ergonomic', 'durable', 'portable', 'classic', 'modern', 'vibrant',
  'precision', 'urban', 'arctic', 'industrial', 'wireless', 'eco',
];
const NOUNS = [
  'lamp', 'mug', 'speaker', 'chair', 'desk', 'pen', 'notebook', 'backpack',
  'jacket', 'watch', 'kettle', 'planter', 'mat', 'cable', 'mouse', 'keyboard',
  'monitor', 'stand', 'pillow', 'rug',
];
// Stryker restore all
const CATEGORIES = ['gadgets', 'apparel', 'home', 'office'] as const;

// 32-bit Mulberry RNG — tiny, deterministic, no dep. Same seed → same stream.
// Exported so unit + mutation tests can pin the output sequence.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

export interface BulkProductRow {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  stock: number;
  category: (typeof CATEGORIES)[number];
  tags: string[];
}

/**
 * Pure row builder for the bulk seed — no DB, deterministic per
 * `(count, rngSeed)`. Same inputs → same output rows, byte for byte.
 * Used by both `seedBulkProducts` (writes to Prisma) and the Vitest +
 * Stryker suites (assert the row shape + invariants).
 */
export function buildBulkProductRows(
  count: number,
  rngSeed = 42,
): BulkProductRow[] {
  const rng = mulberry32(rngSeed);
  return Array.from({ length: count }, (_, i) => {
    const adj = pick(rng, ADJECTIVES);
    const noun = pick(rng, NOUNS);
    const category = pick(rng, CATEGORIES);
    const priceCents = 500 + Math.floor(rng() * 9500); // $5..$100
    const stock = 5 + Math.floor(rng() * 95); // 5..100
    return {
      id: `bulk_${rngSeed}_${i}`,
      name: `${adj[0]!.toUpperCase()}${adj.slice(1)} ${noun}`,
      description: `A ${adj} ${noun} for the discerning shopper.`,
      priceCents,
      stock,
      category,
      tags: [adj, noun, category],
    };
  });
}
