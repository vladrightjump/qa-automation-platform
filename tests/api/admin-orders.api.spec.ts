import { test, expect } from '../fixtures';
import { API_BASE } from '../support/api-client';
import { AddressFactory } from '../factories/address.factory';
import { ProductFactory } from '../factories/product.factory';

async function placePaidOrder(
  api: import('../support/api-client').ApiClient,
  db: import('@qa/db').PrismaClient,
  token: string,
  priceCents = 1000,
) {
  const product = await db.product.create({
    data: ProductFactory.build({ stock: 5, priceCents }),
  });
  await api.createAddress(token, AddressFactory.build({ isDefault: true }));
  await api.addToCart(token, product.id, 1);
  return api.checkout(token, { paymentMethod: 'CARD' });
}

test.describe('admin orders', () => {
  test('@smoke admin fulfils a PAID order → FULFILLED + audit log', async ({
    api,
    db,
    adminUser,
    testUser,
  }) => {
    const order = await placePaidOrder(api, db, testUser.token);

    const fulfilled = await api.adminFulfillOrder(adminUser.token, order.id);
    expect(fulfilled.status).toBe('FULFILLED');

    const log = await db.auditLog.findFirst({
      where: { entity: 'Order', entityId: order.id, action: 'ORDER_FULFILLED' },
    });
    expect(log).not.toBeNull();
  });

  test('@regression admin order list filters by status', async ({
    api,
    db,
    adminUser,
    testUser,
  }) => {
    const order = await placePaidOrder(api, db, testUser.token);

    const paid = await api.adminListOrders(adminUser.token, 'PAID');
    expect(paid.items.some((o) => o.id === order.id)).toBe(true);

    const fulfilled = await api.adminListOrders(adminUser.token, 'FULFILLED');
    expect(fulfilled.items.some((o) => o.id === order.id)).toBe(false);
  });

  test('@regression fulfilling a CANCELLED order returns 400', async ({
    api,
    db,
    adminUser,
    testUser,
  }) => {
    const order = await placePaidOrder(api, db, testUser.token);
    await api.cancelOrder(testUser.token, order.id);

    const res = await api
      .raw()
      .post(`${API_BASE}/admin/orders/${order.id}/fulfill`, {
        headers: { Authorization: `Bearer ${adminUser.token}` },
      });
    expect(res.status()).toBe(400);
  });

  test('@regression a non-admin cannot fulfil orders (403)', async ({
    api,
    db,
    testUser,
  }) => {
    const order = await placePaidOrder(api, db, testUser.token);

    const res = await api
      .raw()
      .post(`${API_BASE}/admin/orders/${order.id}/fulfill`, {
        headers: { Authorization: `Bearer ${testUser.token}` },
      });
    expect(res.status()).toBe(403);
  });

  test('@regression return lifecycle: request → approve → refund', async ({
    api,
    db,
    adminUser,
    testUser,
  }) => {
    const order = await placePaidOrder(api, db, testUser.token, 2500);
    const ret = await api.requestReturn(
      testUser.token,
      order.id,
      'Defective on arrival',
    );

    const approved = await api.adminDecideReturn(
      adminUser.token,
      ret.id,
      'approve',
    );
    expect(approved.status).toBe('APPROVED');

    const refunded = await api.adminDecideReturn(
      adminUser.token,
      ret.id,
      'refund',
    );
    expect(refunded.status).toBe('REFUNDED');
    expect(refunded.refundCents).toBe(order.totalCents);

    const log = await db.auditLog.findFirst({
      where: { entity: 'Return', entityId: ret.id, action: 'RETURN_REFUNDED' },
    });
    expect(log).not.toBeNull();
  });

  test('@regression refunding a not-yet-approved return returns 400', async ({
    api,
    db,
    adminUser,
    testUser,
  }) => {
    const order = await placePaidOrder(api, db, testUser.token);
    const ret = await api.requestReturn(testUser.token, order.id, 'Too big');

    const res = await api
      .raw()
      .post(`${API_BASE}/admin/returns/${ret.id}/refund`, {
        headers: { Authorization: `Bearer ${adminUser.token}` },
      });
    expect(res.status()).toBe(400);
  });
});
