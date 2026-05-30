import { test, expect } from '../fixtures';
import { API_BASE } from '../support/api-client';
import { ProductFactory } from '../factories/product.factory';

test.describe('back-in-stock alerts', () => {
  test('@smoke subscribing to an out-of-stock product creates an alert', async ({
    api,
    db,
    testUser,
  }) => {
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 0 }),
    });

    const alert = await api.subscribeStockAlert(testUser.token, product.id);
    expect(alert.productId).toBe(product.id);
    expect(alert.notified).toBe(false);

    const mine = await api.listStockAlerts(testUser.token);
    expect(mine.some((a) => a.productId === product.id)).toBe(true);
  });

  test('@regression subscribing to an in-stock product returns 400', async ({
    api,
    db,
    testUser,
  }) => {
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 5 }),
    });

    const res = await api
      .raw()
      .post(`${API_BASE}/products/${product.id}/stock-alert`, {
        headers: { Authorization: `Bearer ${testUser.token}` },
      });
    expect(res.status()).toBe(400);
  });

  test('@regression subscribing twice is idempotent', async ({
    api,
    db,
    testUser,
  }) => {
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 0 }),
    });
    await api.subscribeStockAlert(testUser.token, product.id);
    await api.subscribeStockAlert(testUser.token, product.id);

    const count = await db.stockAlert.count({
      where: { userId: testUser.id, productId: product.id },
    });
    expect(count).toBe(1);
  });

  test('@regression unsubscribing removes the alert', async ({
    api,
    db,
    testUser,
  }) => {
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 0 }),
    });
    await api.subscribeStockAlert(testUser.token, product.id);
    await api.unsubscribeStockAlert(testUser.token, product.id);

    const count = await db.stockAlert.count({
      where: { userId: testUser.id, productId: product.id },
    });
    expect(count).toBe(0);
  });

  test('@regression admin restock (0 → >0) notifies subscribers + audit log', async ({
    api,
    db,
    adminUser,
    testUser,
  }) => {
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 0 }),
    });
    const alert = await api.subscribeStockAlert(testUser.token, product.id);

    // Admin restocks the product.
    await api.adminUpdateProduct(adminUser.token, product.id, { stock: 12 });

    await expect
      .poll(() =>
        db.stockAlert
          .findUnique({ where: { id: alert.id } })
          .then((a) => a?.notified),
      )
      .toBe(true);

    const log = await db.auditLog.findFirst({
      where: {
        entity: 'StockAlert',
        entityId: alert.id,
        action: 'STOCK_ALERT_NOTIFIED',
      },
    });
    expect(log).not.toBeNull();
  });
});
