// Promo discovery API: the public GET /promo-codes surface plus the
// minimum-spend and redemption-limit rules enforced by previewPromo/checkout.
//
// Showcase notes:
//   - `toMatchContract(PromoCodeListSchema)` validates the public shape and
//     guarantees internal fields (timesRedeemed/maxRedemptions) never leak.
//   - Codes that must be isolated from parallel specs are created fresh in
//     the DB with unique names, mirroring the factory-per-test philosophy.
import { test, expect } from '../fixtures';
import { PromoCodeListSchema } from '@qa/contracts';
import { ProductFactory } from '../factories/product.factory';

function uniqueCode(prefix: string): string {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

test.describe('promo discovery (API)', () => {
  test('GET /promo-codes lists only featured, active, unexpired codes', {
    tag: ['@regression', '@promo'],
  }, async ({ api }) => {
    const deals = await api.listPromoCodes();
    expect(deals).toMatchContract(PromoCodeListSchema);

    const codes = deals.map((d) => d.code);
    // Seeded featured codes are discoverable.
    expect(codes).toEqual(expect.arrayContaining(['WELCOME10', 'FREESHIP', 'BIG20']));
    // HIDDEN15 is active but not featured; OLDDEAL is expired.
    expect(codes).not.toContain('HIDDEN15');
    expect(codes).not.toContain('OLDDEAL');

    // Public payload never exposes internal redemption bookkeeping.
    const welcome = deals.find((d) => d.code === 'WELCOME10');
    expect(welcome).toMatchObject({ percentOff: 10, minSpendCents: 0 });
    expect(welcome).not.toHaveProperty('timesRedeemed');
    expect(welcome).not.toHaveProperty('maxRedemptions');
  });

  test('a code below its minimum spend is rejected, and applies once met', {
    tag: ['@regression', '@promo', '@boundary'],
  }, async ({ api, db, testUser }) => {
    const code = uniqueCode('MINSPEND');
    await db.promoCode.create({
      data: { code, percentOff: 20, minSpendCents: 5_000, featured: false, active: true },
    });

    // $30 cart — below the $50 minimum → 400.
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 10, priceCents: 3_000 }),
    });
    await api.addToCart(testUser.token, product.id, 1);
    await expect(api.applyPromo(testUser.token, code)).rejects.toThrow(/minimum spend/i);

    // Bump the cart to $60 → the code now applies (20% = $12 off).
    await api.addToCart(testUser.token, product.id, 2);
    const preview = await api.applyPromo(testUser.token, code);
    expect(preview.discountCents).toBe(1_800);
  });

  test('a single-use code is rejected after its redemption limit is reached', {
    tag: ['@regression', '@promo', '@boundary'],
  }, async ({ api, db, testUser }) => {
    const code = uniqueCode('ONCE');
    const promo = await db.promoCode.create({
      data: { code, flatOffCents: 500, maxRedemptions: 1, featured: false, active: true },
    });

    const product = await db.product.create({
      data: ProductFactory.build({ stock: 10, priceCents: 2_000 }),
    });

    // First checkout redeems the code.
    await api.addToCart(testUser.token, product.id, 1);
    const order = await api.checkout(testUser.token, { promoCode: code });
    expect(order.discountCents).toBe(500);

    // Side-effects: redemption counter incremented + audit row written.
    await expect
      .poll(() => db.promoCode.findUnique({ where: { id: promo.id } }).then((p) => p?.timesRedeemed))
      .toBe(1);
    await expect
      .poll(() =>
        db.auditLog.count({
          where: { action: 'PROMO_REDEEMED', entityId: promo.id, userId: testUser.id },
        }),
      )
      .toBe(1);

    // Second attempt — limit exhausted → 400, and no longer discoverable.
    await api.addToCart(testUser.token, product.id, 1);
    await expect(api.applyPromo(testUser.token, code)).rejects.toThrow(/fully redeemed/i);
  });
});
