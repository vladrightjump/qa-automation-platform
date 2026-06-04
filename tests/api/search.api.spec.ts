// Full-text search API. PostgreSQL FTS via Product.searchVector + ts_rank_cd,
// served by GET /products/search. The endpoint is purposefully NOT cached
// (search queries are too varied to make a 30s TTL worthwhile); the cache
// header contract is exercised by tests/api/cache.api.spec.ts instead.
import { test, expect } from '../fixtures';
import { PagedSearchSchema } from '@qa/contracts';

test.describe('product search (API)', () => {
  test('q matches the seeded widget by name and ranks it first', {
    tag: ['@regression', '@search'],
  }, async ({ api }) => {
    const res = await api.searchProducts('widget');
    expect(res).toMatchContract(PagedSearchSchema);

    expect(res.total).toBeGreaterThanOrEqual(1);
    expect(res.items.length).toBeGreaterThanOrEqual(1);

    // The seeded prod_widget has 'widget' in name + tags (weight A + C),
    // so it must rank top. Other seeded products that mention the word in
    // tags/description rank lower; the test is robust to leftover fixtures
    // because we only assert on the *order* of prod_widget vs others.
    expect(res.items[0]!.id).toBe('prod_widget');
    expect(res.items[0]!.score).toBeGreaterThan(0);
  });

  test('result shape includes a server-side tookMs and highlight snippets', {
    tag: ['@regression', '@search'],
  }, async ({ api }) => {
    const res = await api.searchProducts('widget');
    expect(res.tookMs).toBeGreaterThanOrEqual(0);
    expect(res.tookMs).toBeLessThan(5_000);

    const widget = res.items.find((i) => i.id === 'prod_widget');
    expect(widget).toBeDefined();
    // ts_headline wraps matches in <mark>…</mark>.
    expect(widget!.highlights.name).toMatch(/<mark>/i);
  });

  test('pagination: page/pageSize partition the result set', {
    tag: ['@regression', '@search'],
  }, async ({ api }) => {
    const page1 = await api.searchProducts('a', 1, 5);
    const page2 = await api.searchProducts('a', 2, 5);
    expect(page1.items.length).toBeLessThanOrEqual(5);
    expect(page2.items.length).toBeLessThanOrEqual(5);
    // Distinct IDs across pages.
    const ids1 = new Set(page1.items.map((i) => i.id));
    for (const item of page2.items) {
      expect(ids1.has(item.id)).toBe(false);
    }
  });

  test('empty q → 400', {
    tag: ['@regression', '@search', '@edge'],
  }, async ({ api }) => {
    const res = await api.searchProductsRaw('');
    expect(res.status()).toBe(400);
    const missing = await api.searchProductsRaw(undefined);
    expect(missing.status()).toBe(400);
  });

  test('non-matching q → 200 with empty items', {
    tag: ['@regression', '@search', '@empty'],
  }, async ({ api }) => {
    const res = await api.searchProducts('xzqwyzz123nomatch');
    expect(res).toMatchContract(PagedSearchSchema);
    expect(res.total).toBe(0);
    expect(res.items).toEqual([]);
  });
});
