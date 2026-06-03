// Cache observability contract — phase 15a locked invariant:
//
//   X-Cache: hit    — served from cache
//   X-Cache: miss   — passed through and stored
//   X-Cache: bypass — request had `Cache-Control: no-cache`
//
// Tests assert on the header, not on response latency, so cache behaviour
// is deterministic and reviewable. Mutations (admin product CRUD) must bust
// the cache so the next read is X-Cache: miss.
import { test, expect } from '../fixtures';
import { ProductFactory } from '../factories/product.factory';

function uniqueProductId(prefix: string): string {
  // Admin product IDs must match /^prod_[a-z0-9_]+$/.
  return `prod_${prefix}_${Date.now()}_${Math.floor(Math.random() * 10_000)}`;
}

test.describe('cache contract (API)', () => {
  test('repeated GET /products → miss then hit', {
    tag: ['@regression', '@cache'],
  }, async ({ api }) => {
    // Per-spec query so other parallel specs don't share this cache key.
    const cat = 'gadgets';
    const r1 = await api.listProductsRaw({ category: [cat], page: 1, pageSize: 5 });
    expect(r1.headers()['x-cache']).toBe('miss');

    const r2 = await api.listProductsRaw({ category: [cat], page: 1, pageSize: 5 });
    expect(r2.headers()['x-cache']).toBe('hit');
  });

  test('Cache-Control: no-cache bypasses the cache', {
    tag: ['@regression', '@cache'],
  }, async ({ api }) => {
    const cat = 'apparel';
    // Warm the cache first.
    await api.listProductsRaw({ category: [cat], page: 1, pageSize: 5 });

    const bypass = await api.listProductsRaw(
      { category: [cat], page: 1, pageSize: 5 },
      { 'Cache-Control': 'no-cache' },
    );
    expect(bypass.headers()['x-cache']).toBe('bypass');

    // A subsequent normal request still finds the entry — bypass doesn't
    // evict, only skips.
    const next = await api.listProductsRaw({ category: [cat], page: 1, pageSize: 5 });
    expect(next.headers()['x-cache']).toBe('hit');
  });

  test('admin product mutation busts the /products cache', {
    tag: ['@regression', '@cache'],
  }, async ({ api, adminUser }) => {
    // Warm the cache for a distinct query key.
    const warm = await api.listProductsRaw({ category: ['office'], page: 1, pageSize: 5 });
    expect(warm.headers()['x-cache']).toBe('miss');
    const hit = await api.listProductsRaw({ category: ['office'], page: 1, pageSize: 5 });
    expect(hit.headers()['x-cache']).toBe('hit');

    // Mutate the catalog via admin: create then delete a product. Either
    // alone busts the cache; we do both so the test cleans up after itself.
    const id = uniqueProductId('cache_bust');
    const factoryData = ProductFactory.build({ stock: 1 });
    await api.adminCreateProduct(adminUser.token, {
      id,
      name: factoryData.name,
      description: factoryData.description,
      priceCents: factoryData.priceCents,
      stock: factoryData.stock,
      category: 'gadgets',
      tags: ['cache-bust'],
    });

    // The very next list (any query) sees miss because the prefix is busted.
    const afterCreate = await api.listProductsRaw({ category: ['office'], page: 1, pageSize: 5 });
    expect(afterCreate.headers()['x-cache']).toBe('miss');

    await api.adminDeleteProduct(adminUser.token, id);
  });

  test('suggestions endpoint participates in the cache contract', {
    tag: ['@regression', '@cache'],
  }, async ({ api }) => {
    // Use a unique prefix that no other parallel test is likely to hit, so
    // miss/hit ordering is deterministic.
    const q = `wid${Date.now()}`.slice(0, 12);
    const cold = await api.suggestProductsRaw(q, 8);
    expect(cold.headers()['x-cache']).toBe('miss');
    const warm = await api.suggestProductsRaw(q, 8);
    expect(warm.headers()['x-cache']).toBe('hit');
  });
});
