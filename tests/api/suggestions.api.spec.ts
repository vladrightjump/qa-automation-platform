// Autocomplete suggestions API. Prefix-matched against Product.name using a
// lower(name) btree index. Bounded to `limit` (default 8, max 20).
//
// Cache contract: GET /products/suggestions is cached with a 15s TTL.
// A repeated identical request returns X-Cache: hit; `Cache-Control:
// no-cache` produces X-Cache: bypass. Header invariants live in
// cache.api.spec.ts; here we focus on functional correctness.
import { test, expect } from '../fixtures';
import { SuggestionListSchema } from '@qa/contracts';

test.describe('product suggestions (API)', () => {
  test('prefix match returns up to limit results, name-sorted', {
    tag: ['@regression', '@search'],
  }, async ({ api }) => {
    const items = await api.suggestProducts('w', 8);
    expect(items).toMatchContract(SuggestionListSchema);
    expect(items.length).toBeLessThanOrEqual(8);

    // Prefix match (case-insensitive) holds for every result.
    for (const s of items) {
      expect(s.value.toLowerCase().startsWith('w')).toBe(true);
    }
    // Sorted asc by value.
    const sorted = [...items].sort((a, b) => a.value.localeCompare(b.value));
    expect(items.map((i) => i.value)).toEqual(sorted.map((i) => i.value));
  });

  test('limit clamps the response size', {
    tag: ['@regression', '@search'],
  }, async ({ api }) => {
    const items = await api.suggestProducts('a', 3);
    expect(items.length).toBeLessThanOrEqual(3);
  });

  test('empty q → 400; limit out of range → 400', {
    tag: ['@regression', '@search'],
  }, async ({ api }) => {
    const empty = await api.suggestProductsRaw('');
    expect(empty.status()).toBe(400);

    const tooLarge = await api.suggestProductsRaw('w', 50);
    expect(tooLarge.status()).toBe(400);
  });

  test('no prefix match → 200 with empty array', {
    tag: ['@regression', '@search'],
  }, async ({ api }) => {
    const items = await api.suggestProducts('zzzxyz', 8);
    expect(items).toEqual([]);
  });
});
