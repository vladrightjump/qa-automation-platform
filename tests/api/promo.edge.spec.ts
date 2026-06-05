// Promo boundary surface: the math is small but the cliffs are sharp —
// minSpend at ±1¢, percentOff at 0/100, maxRedemptions exhaustion, and
// expiresAt second-precision. All seeded directly in the DB (no admin
// promo-create endpoint exists), all assertions tied to the math in
// `packages/contracts/src/promo-math.ts`.
import { test, expect } from '../fixtures';
import { ProductFactory } from '../factories/product.factory';

function uniqueCode(prefix: string): string {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

test.describe('promo boundary cliffs', () => {
  test(
    'minSpend at 999/1000/1001¢ — rejects below, applies at and above',
    { tag: ['@edge', '@boundary', '@promo', '@regression'] },
    async ({ api, db, testUser }) => {
      const code = uniqueCode('MIN');
      await db.promoCode.create({
        data: { code, percentOff: 20, minSpendCents: 1_000, featured: false, active: true },
      });

      const below = await db.product.create({ data: ProductFactory.build({ stock: 5, priceCents: 999 }) });
      await api.addToCart(testUser.token, below.id, 1);
      await expect(api.applyPromo(testUser.token, code)).rejects.toThrow(/minimum spend/i);

      // Bump to exactly 1000¢: drop the 999¢ item, add a 1000¢ one.
      await api.removeFromCart(testUser.token, below.id);
      const at = await db.product.create({ data: ProductFactory.build({ stock: 5, priceCents: 1_000 }) });
      await api.addToCart(testUser.token, at.id, 1);
      const exact = await api.applyPromo(testUser.token, code);
      expect(exact.discountCents).toBe(200); // 20% of 1000¢

      // Bump above: swap to 1001¢.
      await api.removeFromCart(testUser.token, at.id);
      const above = await db.product.create({ data: ProductFactory.build({ stock: 5, priceCents: 1_001 }) });
      await api.addToCart(testUser.token, above.id, 1);
      const over = await api.applyPromo(testUser.token, code);
      expect(over.discountCents).toBe(200); // floor(1001 * 20 / 100) = 200
    },
  );

  test(
    'percentOff=0 applies trivially with zero discount',
    { tag: ['@edge', '@boundary', '@promo', '@regression'] },
    async ({ api, db, testUser }) => {
      const code = uniqueCode('ZERO');
      await db.promoCode.create({ data: { code, percentOff: 0, featured: false, active: true } });
      const p = await db.product.create({ data: ProductFactory.build({ stock: 3, priceCents: 5_000 }) });
      await api.addToCart(testUser.token, p.id, 1);
      const preview = await api.applyPromo(testUser.token, code);
      expect(preview.discountCents).toBe(0);
    },
  );

  test(
    'percentOff=100 zeroes the order',
    { tag: ['@edge', '@boundary', '@promo', '@regression'] },
    async ({ api, db, testUser }) => {
      const code = uniqueCode('FULL');
      await db.promoCode.create({ data: { code, percentOff: 100, featured: false, active: true } });
      const p = await db.product.create({ data: ProductFactory.build({ stock: 3, priceCents: 2_500 }) });
      await api.addToCart(testUser.token, p.id, 1);
      const preview = await api.applyPromo(testUser.token, code);
      expect(preview.discountCents).toBe(2_500);
    },
  );

  test(
    'maxRedemptions=1 — second applyPromo is rejected after the first checkout consumes the slot',
    { tag: ['@edge', '@boundary', '@promo', '@regression'] },
    async ({ api, db, testUser, adminUser }) => {
      const code = uniqueCode('LAST');
      const promo = await db.promoCode.create({
        data: { code, flatOffCents: 200, maxRedemptions: 1, featured: false, active: true },
      });
      const p = await db.product.create({ data: ProductFactory.build({ stock: 10, priceCents: 1_500 }) });

      // User #1 checks out with the promo — last slot consumed.
      await api.createAddress(testUser.token, {
        label: 'Home', name: 'Test User', line1: '1 Way', city: 'Town', postalCode: '00000', country: 'US', isDefault: true,
      });
      await api.addToCart(testUser.token, p.id, 1);
      await api.checkout(testUser.token, { promoCode: code });

      const after = await db.promoCode.findUnique({ where: { id: promo.id } });
      expect(after?.timesRedeemed).toBe(1);

      // A second user attempts the same code — cap is now full.
      await api.addToCart(adminUser.token, p.id, 1);
      await expect(api.applyPromo(adminUser.token, code)).rejects.toThrow(/fully redeemed/i);
    },
  );

  test(
    'expiresAt — applies a window in the future, rejects a window in the past',
    { tag: ['@edge', '@boundary', '@promo', '@regression'] },
    async ({ api, db, testUser }) => {
      const code = uniqueCode('EXP');
      const promo = await db.promoCode.create({
        data: {
          code,
          percentOff: 10,
          featured: false,
          active: true,
          expiresAt: new Date(Date.now() + 5_000),
        },
      });
      const p = await db.product.create({ data: ProductFactory.build({ stock: 3, priceCents: 1_000 }) });
      await api.addToCart(testUser.token, p.id, 1);

      // Just-in-time: still valid.
      const ok = await api.applyPromo(testUser.token, code);
      expect(ok.discountCents).toBe(100);

      // Push the cliff into the past — same code, same cart — now rejected.
      await db.promoCode.update({ where: { id: promo.id }, data: { expiresAt: new Date(Date.now() - 1_000) } });
      await expect(api.applyPromo(testUser.token, code)).rejects.toThrow(/expired/i);
    },
  );
});
