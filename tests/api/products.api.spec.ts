import { test, expect } from '../fixtures';
import { PagedProductsSchema, ProductSchema } from '@qa/contracts';
import { API_BASE } from '../api-clients';

test.describe('products', () => {
  test('list returns paginated products with the agreed shape', { tag: ['@smoke', '@catalog'] }, async ({
    api,
  }) => {
    const page = await api.products.list({ category: ['office'] });
    expect(PagedProductsSchema.safeParse(page).success).toBe(true);
    expect(page.total).toBeGreaterThan(0);
    expect(page.items.length).toBeLessThanOrEqual(page.pageSize);
    expect(page.items.every((p) => p.category === 'office')).toBe(true);
    expect(page.items.map((p) => p.id)).toContain('prod_notebook_a5');
  });

  test('default sort is name ascending', { tag: ['@regression', '@catalog'] }, async ({ api }) => {
    const page = await api.products.list({ pageSize: 100 });
    const names = page.items.map((p) => p.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });

  test('filter by category narrows results', { tag: ['@regression', '@catalog'] }, async ({ api }) => {
    const all = await api.products.list({ pageSize: 100 });
    const apparel = await api.products.list({
      category: ['apparel'],
      pageSize: 100,
    });
    expect(apparel.total).toBeLessThan(all.total);
    expect(apparel.items.every((p) => p.category === 'apparel')).toBe(true);
  });

  test('filter by multiple categories returns union', { tag: ['@regression', '@catalog'] }, async ({
    api,
  }) => {
    const result = await api.products.list({
      category: ['apparel', 'home'],
      pageSize: 100,
    });
    expect(result.total).toBeGreaterThan(0);
    expect(
      result.items.every(
        (p) => p.category === 'apparel' || p.category === 'home',
      ),
    ).toBe(true);
  });

  test('search q matches name and description case-insensitively', { tag: ['@regression', '@catalog'] }, async ({
    api,
  }) => {
    const result = await api.products.list({ q: 'widget' });
    expect(result.total).toBeGreaterThan(0);
    expect(
      result.items.every(
        (p) =>
          p.name.toLowerCase().includes('widget') ||
          (p.description?.toLowerCase().includes('widget') ?? false),
      ),
    ).toBe(true);
  });

  test('search returns empty page when no match', { tag: ['@regression', '@catalog', '@empty'] }, async ({
    api,
  }) => {
    const result = await api.products.list({ q: 'definitelydoesnotexist' });
    expect(result.total).toBe(0);
    expect(result.items).toEqual([]);
  });

  test('price filter respects min/max', { tag: ['@regression', '@catalog'] }, async ({ api }) => {
    const result = await api.products.list({
      minPriceCents: 1000,
      maxPriceCents: 2000,
      pageSize: 100,
    });
    expect(
      result.items.every(
        (p) => p.priceCents >= 1000 && p.priceCents <= 2000,
      ),
    ).toBe(true);
  });

  test('sort=price_asc orders by price ascending', { tag: ['@regression', '@catalog'] }, async ({
    api,
  }) => {
    const result = await api.products.list({ sort: 'price_asc', pageSize: 100 });
    const prices = result.items.map((p) => p.priceCents);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
  });

  test('sort=price_desc orders by price descending', { tag: ['@regression', '@catalog'] }, async ({
    api,
  }) => {
    const result = await api.products.list({ sort: 'price_desc', pageSize: 100 });
    const prices = result.items.map((p) => p.priceCents);
    expect([...prices].sort((a, b) => b - a)).toEqual(prices);
  });

  test('pagination returns disjoint pages and respects pageSize', { tag: ['@regression', '@catalog'] }, async ({
    api,
  }) => {
    const page1 = await api.products.list({ page: 1, pageSize: 5 });
    const page2 = await api.products.list({ page: 2, pageSize: 5 });
    expect(page1.items).toHaveLength(5);
    expect(page1.page).toBe(1);
    expect(page2.page).toBe(2);
    const overlap = page1.items
      .map((p) => p.id)
      .filter((id) => page2.items.some((p) => p.id === id));
    expect(overlap).toEqual([]);
  });

  test('get by id returns a single product matching the shape', { tag: ['@regression', '@catalog'] }, async ({
    api,
  }) => {
    const product = await api.products.get('prod_widget');
    expect(ProductSchema.safeParse(product).success).toBe(true);
    expect(product.name).toBe('Widget');
    expect(product.category).toBe('gadgets');
  });

  test('get missing product returns 404', { tag: ['@regression', '@catalog', '@negative'] }, async ({ api }) => {
    const res = await api
      .raw()
      .get(`${API_BASE}/products/prod_does_not_exist`);
    expect(res.status()).toBe(404);
  });

  test('invalid sort param rejected with 400', { tag: ['@regression', '@catalog', '@edge'] }, async ({ api }) => {
    const res = await api.raw().get(`${API_BASE}/products?sort=bogus`);
    expect(res.status()).toBe(400);
  });
});
