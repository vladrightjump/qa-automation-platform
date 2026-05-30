import { test, expect } from '../fixtures';
import { API_BASE } from '../support/api-client';
import { AddressFactory } from '../factories/address.factory';
import { ProductFactory } from '../factories/product.factory';

// Helper: place one PAID order for the given user.
async function placePaidOrder(
  api: import('../support/api-client').ApiClient,
  db: import('@qa/db').PrismaClient,
  token: string,
) {
  const product = await db.product.create({
    data: ProductFactory.build({ stock: 3, priceCents: 1200 }),
  });
  await api.createAddress(token, AddressFactory.build({ isDefault: true }));
  await api.addToCart(token, product.id, 1);
  return api.checkout(token, { paymentMethod: 'CARD' });
}

test.describe('order returns', () => {
  test('@smoke requesting a return on a PAID order → REQUESTED + audit log', async ({
    api,
    db,
    testUser,
  }) => {
    const order = await placePaidOrder(api, db, testUser.token);

    const ret = await api.requestReturn(
      testUser.token,
      order.id,
      'Item arrived damaged',
    );
    expect(ret.status).toBe('REQUESTED');
    expect(ret.orderId).toBe(order.id);
    expect(ret.refundCents).toBe(0);

    const log = await db.auditLog.findFirst({
      where: { entity: 'Return', entityId: ret.id, action: 'RETURN_REQUESTED' },
    });
    expect(log).not.toBeNull();
  });

  test('@regression GET /orders/:id surfaces the requested return', async ({
    api,
    db,
    testUser,
  }) => {
    const order = await placePaidOrder(api, db, testUser.token);
    await api.requestReturn(testUser.token, order.id, 'Wrong size');

    const fetched = await api.getOrder(testUser.token, order.id);
    expect(fetched.returns).toHaveLength(1);
    expect(fetched.returns[0]?.reason).toBe('Wrong size');
  });

  test('@regression returning a CANCELLED order returns 400', async ({
    api,
    db,
    testUser,
  }) => {
    const order = await placePaidOrder(api, db, testUser.token);
    await api.cancelOrder(testUser.token, order.id);

    const res = await api.raw().post(`${API_BASE}/orders/${order.id}/return`, {
      headers: { Authorization: `Bearer ${testUser.token}` },
      data: { reason: 'Changed my mind' },
    });
    expect(res.status()).toBe(400);
  });

  test('@regression a second open return on the same order returns 400', async ({
    api,
    db,
    testUser,
  }) => {
    const order = await placePaidOrder(api, db, testUser.token);
    await api.requestReturn(testUser.token, order.id, 'First request');

    const res = await api.raw().post(`${API_BASE}/orders/${order.id}/return`, {
      headers: { Authorization: `Bearer ${testUser.token}` },
      data: { reason: 'Second request' },
    });
    expect(res.status()).toBe(400);
  });

  test('@regression returning another user’s order returns 403', async ({
    api,
    db,
    testUser,
  }) => {
    const order = await placePaidOrder(api, db, testUser.token);

    const other = await api.register(
      `other-${Date.now()}@qa-test.local`,
      'Password123!',
    );
    const res = await api.raw().post(`${API_BASE}/orders/${order.id}/return`, {
      headers: { Authorization: `Bearer ${other.token}` },
      data: { reason: 'Not mine' },
    });
    expect(res.status()).toBe(403);
  });

  test('@regression a too-short reason returns 400', async ({
    api,
    db,
    testUser,
  }) => {
    const order = await placePaidOrder(api, db, testUser.token);

    const res = await api.raw().post(`${API_BASE}/orders/${order.id}/return`, {
      headers: { Authorization: `Bearer ${testUser.token}` },
      data: { reason: 'x' },
    });
    expect(res.status()).toBe(400);
  });
});
