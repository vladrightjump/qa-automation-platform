// Loyalty ledger boundaries: integer floor rounding on .99 prices, the
// order-total clamp on over-requested redemptions, the @Min(0) DTO guard
// on negative input, the balance guard on over-spend, and ledger
// conservation across a mixed earn/redeem sequence. Math expectations
// come from `packages/contracts/src/loyalty-math.ts`.
import { test, expect } from '../fixtures';
import { earnedPoints } from '@qa/contracts';
import { seedPaidOrder, seedProduct, withDefaultAddress } from '../support/seed';

test.describe('loyalty boundary cliffs', () => {
  test(
    'earned points floor — two 199¢ items charge 398¢ and earn 19, not 20',
    { tag: ['@edge', '@boundary', '@loyalty', '@regression'] },
    async ({ api, db, testUser }) => {
      const a = await seedProduct(db, { stock: 5, priceCents: 199 });
      const b = await seedProduct(db, { stock: 5, priceCents: 199 });
      await withDefaultAddress(api, testUser.token);
      await api.addToCart(testUser.token, a.id, 1);
      await api.addToCart(testUser.token, b.id, 1);
      const order = await api.checkout(testUser.token, { paymentMethod: 'CARD' });

      const expected = earnedPoints(398);
      expect(expected).toBe(19); // contract check: floor(398 * 0.05)

      const balance = await api.getLoyalty(testUser.token);
      expect(balance.balancePoints).toBe(expected);

      const earnRow = await db.loyaltyTransaction.findFirst({
        where: { userId: testUser.id, orderId: order.id, type: 'EARN' },
      });
      expect(earnRow?.points).toBe(expected);
    },
  );

  test(
    'requested redemption is clamped to order total, not balance',
    { tag: ['@edge', '@boundary', '@loyalty', '@regression'] },
    async ({ api, db, testUser }) => {
      // Build a 5000-point balance via a 100_000¢ paid order.
      await seedPaidOrder(api, db, { token: testUser.token, priceCents: 100_000, stock: 1, qty: 1 });
      const seeded = await api.getLoyalty(testUser.token);
      expect(seeded.balancePoints).toBe(5_000);

      // Next order subtotal = 3000¢; request 5000 points → clamp to 3000.
      const product = await seedProduct(db, { stock: 5, priceCents: 3_000 });
      await api.addToCart(testUser.token, product.id, 1);
      const order = await api.checkout(testUser.token, { paymentMethod: 'CARD', redeemPoints: 5_000 });
      expect(order.totalCents).toBe(0); // 3000 - 3000 redeem

      const redeemRow = await db.loyaltyTransaction.findFirst({
        where: { userId: testUser.id, orderId: order.id, type: 'REDEEM' },
      });
      expect(redeemRow?.points).toBe(-3_000);

      // Charged 0 → earns 0 → ending balance = 5000 - 3000 = 2000.
      const after = await api.getLoyalty(testUser.token);
      expect(after.balancePoints).toBe(2_000);
    },
  );

  test(
    'negative redeemPoints rejected by DTO, balance untouched',
    { tag: ['@edge', '@boundary', '@loyalty', '@regression', '@negative'] },
    async ({ api, db, testUser }) => {
      await seedPaidOrder(api, db, { token: testUser.token, priceCents: 2_000, stock: 1, qty: 1 });
      const before = await api.getLoyalty(testUser.token);

      const product = await seedProduct(db, { stock: 1, priceCents: 1_000 });
      await api.addToCart(testUser.token, product.id, 1);
      await expect(
        api.checkout(testUser.token, { paymentMethod: 'CARD', redeemPoints: -100 }),
      ).rejects.toThrow();

      const after = await api.getLoyalty(testUser.token);
      expect(after.balancePoints).toBe(before.balancePoints);
    },
  );

  test(
    'redeem past balance rejected, balance untouched',
    { tag: ['@edge', '@boundary', '@loyalty', '@regression', '@negative'] },
    async ({ api, db, testUser }) => {
      // Fresh user, balance = 0.
      const balanceBefore = (await api.getLoyalty(testUser.token)).balancePoints;
      expect(balanceBefore).toBe(0);

      await withDefaultAddress(api, testUser.token);
      const p = await seedProduct(db, { stock: 1, priceCents: 1_000 });
      await api.addToCart(testUser.token, p.id, 1);
      await expect(
        api.checkout(testUser.token, { paymentMethod: 'CARD', redeemPoints: 1 }),
      ).rejects.toThrow(/balance/i);

      const after = await api.getLoyalty(testUser.token);
      expect(after.balancePoints).toBe(0);
    },
  );

  test(
    'ledger conservation — sum of signed points equals API-reported balance',
    { tag: ['@edge', '@boundary', '@loyalty', '@regression'] },
    async ({ api, db, testUser }) => {
      // Two earns + one redeem in any order.
      await seedPaidOrder(api, db, { token: testUser.token, priceCents: 4_000, stock: 1, qty: 1 });
      await seedPaidOrder(api, db, { token: testUser.token, priceCents: 6_000, stock: 1, qty: 1 });

      const small = await seedProduct(db, { stock: 1, priceCents: 1_000 });
      await api.addToCart(testUser.token, small.id, 1);
      await api.checkout(testUser.token, { paymentMethod: 'CARD', redeemPoints: 50 });

      const ledger = await db.loyaltyTransaction.findMany({ where: { userId: testUser.id } });
      const sum = ledger.reduce((acc, r) => acc + r.points, 0);

      const balance = await api.getLoyalty(testUser.token);
      expect(balance.balancePoints).toBe(sum);
      // Sanity: there were both signs in the ledger.
      expect(ledger.some((r) => r.type === 'EARN')).toBe(true);
      expect(ledger.some((r) => r.type === 'REDEEM')).toBe(true);
    },
  );
});
