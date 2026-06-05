// Chaos / fault-injection: arm a one-shot failure at the stock-decrement
// stage inside the checkout transaction, then assert that the throw rolls
// back every side-effect (order, audit log, stock decrement, cart clear).
// This is the platform's transactional-rollback story, written within the
// existing Playwright stack instead of bolting on Toxiproxy.
//
// The flag is scoped per-userId on the API side so this spec can run in
// parallel with other checkout-touching tests. The injection auto-clears
// on fire, and /test/reset clears it explicitly — both safety nets so a
// crashed-mid-test run can't poison the next case.
import { test, expect } from '../fixtures';
import { API_BASE } from '../support/api-client';
import { ProductFactory } from '../factories/product.factory';
import { UserFactory } from '../factories/user.factory';
import { withDefaultAddress } from '../support/seed';

test.describe.configure({ mode: 'serial' });

test.describe('fault injection', () => {
  test(
    'injected failure at stock-decrement rolls back the checkout transaction',
    { tag: ['@race', '@negative', '@regression'] },
    async ({ api, db }) => {
      const product = await db.product.create({
        data: ProductFactory.build({ stock: 5, priceCents: 1_000 }),
      });
      const creds = UserFactory.build();
      const { token, user } = await api.register(creds.email, creds.password);
      await withDefaultAddress(api, token);
      await api.addToCart(token, product.id, 1);

      const ordersBefore = await db.order.count({ where: { userId: user.id } });
      const auditsBefore = await db.auditLog.count({
        where: { userId: user.id, action: 'ORDER_PAID' },
      });

      // Arm the trap for this user only.
      const armed = await api
        .raw()
        .post(
          `${API_BASE}/test/inject-failure?at=stock-decrement&userId=${user.id}`,
        );
      expect(armed.ok()).toBe(true);

      // Trigger checkout — the throw inside the txn surfaces as a 5xx.
      const res = await api.raw().post(`${API_BASE}/orders`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { paymentMethod: 'CARD' },
      });
      expect(res.status()).toBeGreaterThanOrEqual(500);

      // Every side-effect inside the txn must be rolled back.
      const productNow = await db.product.findUnique({ where: { id: product.id } });
      expect(productNow?.stock).toBe(5);

      const ordersAfter = await db.order.count({ where: { userId: user.id } });
      expect(ordersAfter).toBe(ordersBefore);

      const auditsAfter = await db.auditLog.count({
        where: { userId: user.id, action: 'ORDER_PAID' },
      });
      expect(auditsAfter).toBe(auditsBefore);

      const cartItems = await db.cartItem.findMany({
        where: { cart: { userId: user.id } },
      });
      expect(cartItems).toHaveLength(1);
      expect(cartItems[0]?.quantity).toBe(1);
    },
  );
});
