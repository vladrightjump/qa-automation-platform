// Concurrency contention against the real API. No k6, no Toxiproxy — three
// Promise.all storms over the existing APIRequestContext, with DB-level
// truth-checks via the shared Prisma singleton. Each test seeds its own
// products/users via factories so parallel-test ordering can't perturb the
// assertions.
import { faker } from '@faker-js/faker';
import { test, expect } from '../fixtures';
import { ProductFactory } from '../factories/product.factory';
import { UserFactory } from '../factories/user.factory';
import { withDefaultAddress } from '../support/seed';
import type { Order } from '@qa/contracts';

test.describe('race conditions', () => {
  test(
    '50 parallel addToCart calls land as quantity=50 (no lost updates)',
    { tag: ['@race', '@regression', '@slow'] },
    async ({ api, db, testUser }) => {
      const product = await db.product.create({
        data: ProductFactory.build({ stock: 100 }),
      });

      await Promise.all(
        Array.from({ length: 50 }, () =>
          api.addToCart(testUser.token, product.id, 1),
        ),
      );

      const items = await db.cartItem.findMany({
        where: { productId: product.id, cart: { userId: testUser.id } },
      });
      expect(items).toHaveLength(1);
      expect(items[0]?.quantity).toBe(50);
    },
  );

  test(
    '5 parallel checkouts on stock=3 — exactly 3 succeed, stock=0, no orphans',
    { tag: ['@race', '@regression', '@slow'] },
    async ({ api, db }) => {
      const product = await db.product.create({
        data: ProductFactory.build({ stock: 3, priceCents: 1_000 }),
      });

      const users = await Promise.all(
        Array.from({ length: 5 }, async () => {
          const creds = UserFactory.build();
          const { token } = await api.register(creds.email, creds.password);
          await withDefaultAddress(api, token);
          await api.addToCart(token, product.id, 1);
          return token;
        }),
      );

      const results = await Promise.allSettled(
        users.map((token) => api.checkout(token, { paymentMethod: 'CARD' })),
      );
      const successes = results.filter(
        (r): r is PromiseFulfilledResult<Order> => r.status === 'fulfilled',
      );
      const failures = results.filter((r) => r.status === 'rejected');
      expect(successes).toHaveLength(3);
      expect(failures).toHaveLength(2);

      const productNow = await db.product.findUnique({ where: { id: product.id } });
      expect(productNow?.stock).toBe(0);

      const audits = await db.auditLog.count({
        where: {
          action: 'ORDER_PAID',
          entity: 'Order',
          entityId: { in: successes.map((s) => s.value.id) },
        },
      });
      expect(audits).toBe(3);

      const pending = await db.order.count({
        where: { status: 'PENDING', items: { some: { productId: product.id } } },
      });
      expect(pending).toBe(0);
    },
  );

  test(
    'promo cap=2 holds under 5 parallel checkouts',
    { tag: ['@race', '@regression', '@slow'] },
    async ({ api, db }) => {
      const code = `RACE_${faker.string.alphanumeric(8).toUpperCase()}`;
      const promo = await db.promoCode.create({
        data: {
          code,
          percentOff: 10,
          maxRedemptions: 2,
          active: true,
          featured: false,
        },
      });
      const product = await db.product.create({
        data: ProductFactory.build({ stock: 100, priceCents: 1_000 }),
      });

      const users = await Promise.all(
        Array.from({ length: 5 }, async () => {
          const creds = UserFactory.build();
          const { token } = await api.register(creds.email, creds.password);
          await withDefaultAddress(api, token);
          await api.addToCart(token, product.id, 1);
          return token;
        }),
      );

      const results = await Promise.allSettled(
        users.map((token) =>
          api.checkout(token, { promoCode: code, paymentMethod: 'CARD' }),
        ),
      );
      const successes = results.filter((r) => r.status === 'fulfilled').length;
      expect(successes).toBe(2);

      const after = await db.promoCode.findUnique({ where: { id: promo.id } });
      expect(after?.timesRedeemed).toBe(2);
    },
  );
});
