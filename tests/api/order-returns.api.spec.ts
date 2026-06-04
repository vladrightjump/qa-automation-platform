import { test, expect } from '../fixtures';
import { API_BASE } from '../support/api-client';
import { seedPaidOrder } from '../support/seed';

test.describe('order returns', () => {
  test('requesting a return on a PAID order → REQUESTED + audit log', { tag: ['@smoke', '@returns'] }, async ({
    api,
    db,
    testUser,
  }) => {
    const order = await seedPaidOrder(api, db, { token: testUser.token, priceCents: 1200, stock: 3 });

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

  test('GET /orders/:id surfaces the requested return', { tag: ['@regression', '@returns'] }, async ({
    api,
    db,
    testUser,
  }) => {
    const order = await seedPaidOrder(api, db, { token: testUser.token, priceCents: 1200, stock: 3 });
    await api.requestReturn(testUser.token, order.id, 'Wrong size');

    const fetched = await api.getOrder(testUser.token, order.id);
    expect(fetched.returns).toHaveLength(1);
    expect(fetched.returns[0]?.reason).toBe('Wrong size');
  });

  test('returning a CANCELLED order returns 400', { tag: ['@regression', '@returns', '@negative'] }, async ({
    api,
    db,
    testUser,
  }) => {
    const order = await seedPaidOrder(api, db, { token: testUser.token, priceCents: 1200, stock: 3 });
    await api.cancelOrder(testUser.token, order.id);

    const res = await api.raw().post(`${API_BASE}/orders/${order.id}/return`, {
      headers: { Authorization: `Bearer ${testUser.token}` },
      data: { reason: 'Changed my mind' },
    });
    expect(res.status()).toBe(400);
  });

  test('a second open return on the same order returns 400', { tag: ['@regression', '@returns', '@negative'] }, async ({
    api,
    db,
    testUser,
  }) => {
    const order = await seedPaidOrder(api, db, { token: testUser.token, priceCents: 1200, stock: 3 });
    await api.requestReturn(testUser.token, order.id, 'First request');

    const res = await api.raw().post(`${API_BASE}/orders/${order.id}/return`, {
      headers: { Authorization: `Bearer ${testUser.token}` },
      data: { reason: 'Second request' },
    });
    expect(res.status()).toBe(400);
  });

  test('returning another user’s order returns 403', { tag: ['@regression', '@returns', '@security'] }, async ({
    api,
    db,
    testUser,
  }) => {
    const order = await seedPaidOrder(api, db, { token: testUser.token, priceCents: 1200, stock: 3 });

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

  test('a too-short reason returns 400', { tag: ['@regression', '@returns', '@edge'] }, async ({
    api,
    db,
    testUser,
  }) => {
    const order = await seedPaidOrder(api, db, { token: testUser.token, priceCents: 1200, stock: 3 });

    const res = await api.raw().post(`${API_BASE}/orders/${order.id}/return`, {
      headers: { Authorization: `Bearer ${testUser.token}` },
      data: { reason: 'x' },
    });
    expect(res.status()).toBe(400);
  });
});
