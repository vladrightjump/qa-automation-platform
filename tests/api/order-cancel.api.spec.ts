import { test, expect } from '../fixtures';
import { API_BASE } from '../support/api-client';
import { seedPaidOrder } from '../support/seed';

test.describe('order cancel', () => {
  test('cancelling a PAID order transitions to CANCELLED + audit log', { tag: ['@smoke', '@orders'] }, async ({
    api,
    db,
    testUser,
  }) => {
    const order = await seedPaidOrder(api, db, {
      token: testUser.token,
      priceCents: 500,
      stock: 3,
    });

    const cancelled = await api.cancelOrder(testUser.token, order.id);
    expect(cancelled.status).toBe('CANCELLED');

    const log = await db.auditLog.findFirst({
      where: { entity: 'Order', entityId: order.id, action: 'ORDER_CANCELLED' },
    });
    expect(log).not.toBeNull();
  });

  test('cancelling an already-cancelled order returns 400', { tag: ['@regression', '@orders'] }, async ({
    api,
    db,
    testUser,
  }) => {
    const order = await seedPaidOrder(api, db, {
      token: testUser.token,
      priceCents: 200,
      stock: 1,
    });
    await api.cancelOrder(testUser.token, order.id);

    const res = await api.raw().post(`${API_BASE}/orders/${order.id}/cancel`, {
      headers: { Authorization: `Bearer ${testUser.token}` },
    });
    expect(res.status()).toBe(400);
  });

  test('cancelling another user’s order returns 403', { tag: ['@regression', '@orders'] }, async ({
    api,
    db,
    testUser,
  }) => {
    const order = await seedPaidOrder(api, db, {
      token: testUser.token,
      priceCents: 200,
      stock: 1,
    });

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
