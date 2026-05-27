import { test, expect } from '../fixtures';
import { ProductListSchema, ProductSchema } from '@qa/contracts';
import { API_BASE } from '../support/api-client';

test.describe('products', () => {
  test('@smoke list returns the seeded products with valid shape', async ({ api }) => {
    const products = await api.listProducts();
    expect(ProductListSchema.safeParse(products).success).toBe(true);
    const ids = products.map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining(['prod_widget', 'prod_gizmo']));
  });

  test('@regression list is sorted by id (deterministic for tests)', async ({ api }) => {
    const products = await api.listProducts();
    const ids = products.map((p) => p.id);
    const sorted = [...ids].sort();
    expect(ids).toEqual(sorted);
  });

  test('@regression get by id returns a single product matching the shape', async ({ api }) => {
    const product = await api.getProduct('prod_widget');
    expect(ProductSchema.safeParse(product).success).toBe(true);
    expect(product.name).toBe('Widget');
  });

  test('@regression get missing product returns 404', async ({ api }) => {
    const res = await api.raw().get(`${API_BASE}/products/prod_does_not_exist`);
    expect(res.status()).toBe(404);
  });
});
