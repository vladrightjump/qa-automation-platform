import { test, expect } from '../fixtures';
import { OrderSchema } from '@qa/contracts';
import { ProductFactory } from '../factories/product.factory';
import { UserFactory } from '../factories/user.factory';
import { API_BASE } from '../support/api-client';

test.describe('orders / checkout', () => {
  test('@regression checkout with empty cart returns 400', async ({ api, testUser }) => {
    const res = await api.raw().post(`${API_BASE}/orders`, {
      headers: { Authorization: `Bearer ${testUser.token}` },
    });
    expect(res.status()).toBe(400);
  });

  test('@regression checkout an out-of-stock product returns 400', async ({
    api,
    testUser,
  }) => {
    // prod_oos has stock=0 in the seed — addToCart succeeds (it's a future intent)
    // but checkout's stock check fails.
    await api.addToCart(testUser.token, 'prod_oos', 1);
    const res = await api.raw().post(`${API_BASE}/orders`, {
      headers: { Authorization: `Bearer ${testUser.token}` },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(String(body.message)).toMatch(/stock/i);
  });

  test('@smoke checkout returns a PAID order with correct totals', async ({
    api,
    db,
    testUser,
  }) => {
    // Each test owns its own product so concurrent stock-decrement tests
    // don't race on the seeded SKUs.
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 10, priceCents: 1500 }),
    });

    await api.addToCart(testUser.token, product.id, 2);
    const order = await api.checkout(testUser.token);

    expect(OrderSchema.safeParse(order).success).toBe(true);
    expect(order.status).toBe('PAID');
    expect(order.totalCents).toBe(3000);
    expect(order.items).toHaveLength(1);
    expect(order.items[0]?.unitPriceCents).toBe(1500);
    expect(order.items[0]?.quantity).toBe(2);
  });

  test('@regression list orders returns the user own orders only', async ({
    api,
    db,
    testUser,
  }) => {
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 5 }),
    });
    await api.addToCart(testUser.token, product.id, 1);
    await api.checkout(testUser.token);

    const orders = await api.listOrders(testUser.token);
    expect(orders.length).toBeGreaterThan(0);
    for (const o of orders) expect(o.userId).toBe(testUser.id);
  });

  test('@regression get another user order returns 403', async ({ api, db, testUser }) => {
    // Create a second user with their own order.
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 5 }),
    });
    const otherCreds = UserFactory.build();
    const other = await api.register(otherCreds.email, otherCreds.password);
    await api.addToCart(other.token, product.id, 1);
    const otherOrder = await api.checkout(other.token);

    // testUser tries to read the other's order
    const res = await api.raw().get(`${API_BASE}/orders/${otherOrder.id}`, {
      headers: { Authorization: `Bearer ${testUser.token}` },
    });
    expect(res.status()).toBe(403);
  });

  test('@regression get a non-existent order returns 404', async ({ api, testUser }) => {
    const res = await api.raw().get(`${API_BASE}/orders/does_not_exist`, {
      headers: { Authorization: `Bearer ${testUser.token}` },
    });
    expect(res.status()).toBe(404);
  });
});
