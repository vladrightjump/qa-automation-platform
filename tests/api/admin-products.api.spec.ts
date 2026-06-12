import { test, expect } from '../fixtures';
import { ProductSchema } from '@qa/contracts';
import { API_BASE } from '../api-clients';
import { AdminProductFactory } from '../factories/admin-product.factory';

test.describe('admin/products', () => {
  test('admin can create a product and it appears in the public list', { tag: ['@smoke', '@admin'] }, async ({
    api,
    adminUser,
  }) => {
    const input = AdminProductFactory.build({ stock: 5, priceCents: 12345 });
    const created = await api.admin.createProduct(adminUser.token, input);
    expect(ProductSchema.safeParse(created).success).toBe(true);
    expect(created.id).toBe(input.id);

    const page = await api.products.list({ q: input.name });
    expect(page.items.map((p) => p.id)).toContain(input.id);

    // cleanup
    await api.admin.deleteProduct(adminUser.token, input.id);
  });

  test('non-admin user gets 403 on admin endpoints', { tag: ['@regression', '@admin', '@security'] }, async ({
    api,
    testUser,
  }) => {
    const res = await api.raw().get(`${API_BASE}/admin/products`, {
      headers: { Authorization: `Bearer ${testUser.token}` },
    });
    expect(res.status()).toBe(403);
  });

  test('unauthenticated request gets 401', { tag: ['@regression', '@admin', '@security'] }, async ({ api }) => {
    const res = await api.raw().get(`${API_BASE}/admin/products`);
    expect(res.status()).toBe(401);
  });

  test('duplicate id returns 409', { tag: ['@regression', '@admin', '@negative'] }, async ({ api, adminUser }) => {
    const input = AdminProductFactory.build();
    await api.admin.createProduct(adminUser.token, input);
    const res = await api.raw().post(`${API_BASE}/admin/products`, {
      headers: { Authorization: `Bearer ${adminUser.token}` },
      data: input,
    });
    expect(res.status()).toBe(409);
    await api.admin.deleteProduct(adminUser.token, input.id);
  });

  test('invalid id pattern rejected with 400', { tag: ['@regression', '@admin', '@edge'] }, async ({
    api,
    adminUser,
  }) => {
    const input = AdminProductFactory.build({ id: 'INVALID-id' });
    const res = await api.raw().post(`${API_BASE}/admin/products`, {
      headers: { Authorization: `Bearer ${adminUser.token}` },
      data: input,
    });
    expect(res.status()).toBe(400);
  });

  test('admin can update product fields', { tag: ['@regression', '@admin'] }, async ({
    api,
    adminUser,
  }) => {
    const input = AdminProductFactory.build({ priceCents: 1000, stock: 5 });
    await api.admin.createProduct(adminUser.token, input);

    const updated = await api.admin.updateProduct(adminUser.token, input.id, {
      priceCents: 2000,
      stock: 99,
    });
    expect(updated.priceCents).toBe(2000);
    expect(updated.stock).toBe(99);

    await api.admin.deleteProduct(adminUser.token, input.id);
  });

  test('admin can delete product not referenced by orders', { tag: ['@regression', '@admin'] }, async ({
    api,
    adminUser,
    db,
  }) => {
    const input = AdminProductFactory.build();
    await api.admin.createProduct(adminUser.token, input);
    await api.admin.deleteProduct(adminUser.token, input.id);
    const found = await db.product.findUnique({ where: { id: input.id } });
    expect(found).toBeNull();
  });

  test('cannot delete product referenced by an order (409)', { tag: ['@regression', '@admin', '@negative'] }, async ({
    api,
    adminUser,
    db,
    testUser,
  }) => {
    const input = AdminProductFactory.build({ stock: 2 });
    await api.admin.createProduct(adminUser.token, input);
    await api.cart.addItem(testUser.token, input.id, 1);
    await api.checkout.checkout(testUser.token);

    const res = await api.raw().delete(`${API_BASE}/admin/products/${input.id}`, {
      headers: { Authorization: `Bearer ${adminUser.token}` },
    });
    expect(res.status()).toBe(409);

    // cleanup: the product remains; an admin in a real ops UI would
    // archive it instead. For test hygiene, blow away the order/items.
    await db.orderItem.deleteMany({ where: { productId: input.id } });
    await db.product.delete({ where: { id: input.id } });
  });
});
