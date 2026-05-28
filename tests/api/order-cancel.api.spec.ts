import { test, expect } from '../fixtures';
import { API_BASE } from '../support/api-client';
import { AddressFactory } from '../factories/address.factory';
import { ProductFactory } from '../factories/product.factory';

test.describe('order cancel', () => {
  test('@smoke cancelling a PAID order transitions to CANCELLED + audit log', async ({
    api,
    db,
    testUser,
  }) => {
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 3, priceCents: 500 }),
    });
    await api.createAddress(
      testUser.token,
      AddressFactory.build({ isDefault: true }),
    );
    await api.addToCart(testUser.token, product.id, 1);
    const order = await api.checkout(testUser.token, { paymentMethod: 'CARD' });

    const cancelled = await api.cancelOrder(testUser.token, order.id);
    expect(cancelled.status).toBe('CANCELLED');

    const log = await db.auditLog.findFirst({
      where: { entity: 'Order', entityId: order.id, action: 'ORDER_CANCELLED' },
    });
    expect(log).not.toBeNull();
  });

  test('@regression cancelling an already-cancelled order returns 400', async ({
    api,
    db,
    testUser,
  }) => {
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 1, priceCents: 200 }),
    });
    await api.createAddress(
      testUser.token,
      AddressFactory.build({ isDefault: true }),
    );
    await api.addToCart(testUser.token, product.id, 1);
    const order = await api.checkout(testUser.token);
    await api.cancelOrder(testUser.token, order.id);

    const res = await api.raw().post(`${API_BASE}/orders/${order.id}/cancel`, {
      headers: { Authorization: `Bearer ${testUser.token}` },
    });
    expect(res.status()).toBe(400);
  });

  test('@regression cancelling another user’s order returns 403', async ({
    api,
    db,
    testUser,
  }) => {
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 1, priceCents: 200 }),
    });
    await api.createAddress(
      testUser.token,
      AddressFactory.build({ isDefault: true }),
    );
    await api.addToCart(testUser.token, product.id, 1);
    const order = await api.checkout(testUser.token);

    const other = await api.register(
      `other-${Date.now()}@qa-test.local`,
      'Password123!',
    );
    const res = await api.raw().post(`${API_BASE}/orders/${order.id}/cancel`, {
      headers: { Authorization: `Bearer ${other.token}` },
    });
    expect(res.status()).toBe(403);
  });
});
