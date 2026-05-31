import { test, expect } from '../fixtures';
import { API_BASE } from '../support/api-client';
import { ProductFactory } from '../factories/product.factory';

// Earn rate mirrors LOYALTY_EARN_RATE in the API (5% of the charged total,
// 1 point = 1¢). A $20.00 order earns floor(2000 * 0.05) = 100 points.
async function earnViaCheckout(
  api: import('../support/api-client').ApiClient,
  db: import('@qa/db').PrismaClient,
  token: string,
  priceCents: number,
) {
  const product = await db.product.create({
    data: ProductFactory.build({ stock: 5, priceCents }),
  });
  await api.addToCart(token, product.id, 1);
  return api.checkout(token);
}

test.describe('loyalty points / store credit', () => {
  test('@smoke checkout earns 5% back as points + audit log', async ({
    api,
    db,
    testUser,
  }) => {
    const order = await earnViaCheckout(api, db, testUser.token, 2000);
    expect(order.totalCents).toBe(2000);

    const loyalty = await api.getLoyalty(testUser.token);
    expect(loyalty.balancePoints).toBe(100);

    const log = await db.auditLog.findFirst({
      where: { entity: 'Order', entityId: order.id, action: 'LOYALTY_EARNED' },
    });
    expect(log).not.toBeNull();
  });

  test('@regression redeeming points reduces the total and the ledger nets out', async ({
    api,
    db,
    testUser,
  }) => {
    await earnViaCheckout(api, db, testUser.token, 2000); // +100

    const product = await db.product.create({
      data: ProductFactory.build({ stock: 5, priceCents: 1000 }),
    });
    await api.addToCart(testUser.token, product.id, 1);
    const order = await api.checkout(testUser.token, { redeemPoints: 100 });

    // 1000 − 100 redeemed = 900 charged.
    expect(order.totalCents).toBe(900);

    // Balance: +100 (first order) − 100 (redeemed) + 45 (5% of 900) = 45.
    const loyalty = await api.getLoyalty(testUser.token);
    expect(loyalty.balancePoints).toBe(45);
  });

  test('@regression redeeming more than the balance returns 400', async ({
    api,
    db,
    testUser,
  }) => {
    await earnViaCheckout(api, db, testUser.token, 2000); // balance 100

    const product = await db.product.create({
      data: ProductFactory.build({ stock: 5, priceCents: 1000 }),
    });
    await api.addToCart(testUser.token, product.id, 1);

    const res = await api.raw().post(`${API_BASE}/orders`, {
      headers: { Authorization: `Bearer ${testUser.token}` },
      data: { redeemPoints: 200 },
    });
    expect(res.status()).toBe(400);
  });

  test('@regression a promo discount and store credit stack', async ({
    api,
    db,
    testUser,
  }) => {
    await earnViaCheckout(api, db, testUser.token, 2000); // +100

    const code = `LOYAL${Date.now()}${Math.floor(Math.random() * 1000)}`;
    await db.promoCode.create({
      data: { code, flatOffCents: 500, minSpendCents: 0, active: true },
    });

    const product = await db.product.create({
      data: ProductFactory.build({ stock: 5, priceCents: 3000 }),
    });
    await api.addToCart(testUser.token, product.id, 1);
    const order = await api.checkout(testUser.token, {
      promoCode: code,
      redeemPoints: 100,
    });

    // 3000 − 500 promo − 100 credit = 2400.
    expect(order.totalCents).toBe(2400);
  });
});
