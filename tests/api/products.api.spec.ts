import { test, expect } from '../fixtures';
import { PagedProductsSchema, ProductSchema } from '@qa/contracts';
import { API_BASE } from '../support/api-client';

test.describe('products', () => {
  test('@smoke list returns paginated products with the agreed shape', async ({
    api,
  }) => {
    const page = await api.listProducts({ category: ['office'] });
    expect(PagedProductsSchema.safeParse(page).success).toBe(true);
    expect(page.total).toBeGreaterThan(0);
    expect(page.items.length).toBeLessThanOrEqual(page.pageSize);
    expect(page.items.every((p) => p.category === 'office')).toBe(true);
    expect(page.items.map((p) => p.id)).toContain('prod_notebook_a5');
  });

  test('@regression default sort is name ascending', async ({ api }) => {
    const page = await api.listProducts({ pageSize: 100 });
    const names = page.items.map((p) => p.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });

  test('@regression filter by category narrows results', async ({ api }) => {
    const all = await api.listProducts({ pageSize: 100 });
    const apparel = await api.listProducts({
      category: ['apparel'],
      pageSize: 100,
    });
    expect(apparel.total).toBeLessThan(all.total);
    expect(apparel.items.every((p) => p.category === 'apparel')).toBe(true);
  });

  test('@regression filter by multiple categories returns union', async ({
    api,
  }) => {
    const result = await api.listProducts({
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

  test('@regression search q matches name and description case-insensitively', async ({
    api,
  }) => {
    const result = await api.listProducts({ q: 'widget' });
    expect(result.total).toBeGreaterThan(0);
    expect(
      result.items.every(
        (p) =>
          p.name.toLowerCase().includes('widget') ||
          (p.description?.toLowerCase().includes('widget') ?? false),
      ),
    ).toBe(true);
  });

  test('@regression search returns empty page when no match', async ({
    api,
  }) => {
    const result = await api.listProducts({ q: 'definitelydoesnotexist' });
    expect(result.total).toBe(0);
    expect(result.items).toEqual([]);
  });

  test('@regression price filter respects min/max', async ({ api }) => {
    const result = await api.listProducts({
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

  test('@regression sort=price_asc orders by price ascending', async ({
    api,
  }) => {
    const result = await api.listProducts({ sort: 'price_asc', pageSize: 100 });
    const prices = result.items.map((p) => p.priceCents);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
  });

  test('@regression sort=price_desc orders by price descending', async ({
    api,
  }) => {
    const result = await api.listProducts({ sort: 'price_desc', pageSize: 100 });
    const prices = result.items.map((p) => p.priceCents);
    expect([...prices].sort((a, b) => b - a)).toEqual(prices);
  });

  test('@regression pagination returns disjoint pages and respects pageSize', async ({
    api,
  }) => {
    const page1 = await api.listProducts({ page: 1, pageSize: 5 });
    const page2 = await api.listProducts({ page: 2, pageSize: 5 });
    expect(page1.items).toHaveLength(5);
    expect(page1.page).toBe(1);
    expect(page2.page).toBe(2);
    const overlap = page1.items
      .map((p) => p.id)
      .filter((id) => page2.items.some((p) => p.id === id));
    expect(overlap).toEqual([]);
  });

  test('@regression get by id returns a single product matching the shape', async ({
    api,
  }) => {
    const product = await api.getProduct('prod_widget');
    expect(ProductSchema.safeParse(product).success).toBe(true);
    expect(product.name).toBe('Widget');
    expect(product.category).toBe('gadgets');
  });

  test('@regression get missing product returns 404', async ({ api }) => {
    const res = await api
      .raw()
      .get(`${API_BASE}/products/prod_does_not_exist`);
    expect(res.status()).toBe(404);
  });

  test('@regression invalid sort param rejected with 400', async ({ api }) => {
    const res = await api.raw().get(`${API_BASE}/products?sort=bogus`);
    expect(res.status()).toBe(400);
  });
});
