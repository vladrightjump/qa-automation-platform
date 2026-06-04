// Promo discovery (UI): the "available deals" panel on the checkout review
// step lets shoppers find and one-click-apply featured codes. State is seeded
// via API/DB, the flow is driven through the browser, and the discount is
// confirmed as ground truth in the DB (order row + PROMO_REDEEMED audit log).
import { test, expect } from '../fixtures';
import { ProductFactory } from '../factories/product.factory';
import { AddressFactory } from '../factories/address.factory';

test.describe('promo discovery (UI)', () => {
  test('discover a deal in the panel, apply it, and redeem it at checkout', {
    tag: ['@smoke', '@promo', '@sanity'],
  }, async ({ authedPage, api, db, testUser, cart, checkout }) => {
    await test.step('seed: address + a $100 cart', async () => {
      await api.createAddress(testUser.token, AddressFactory.build({ isDefault: true }));
      const p = await db.product.create({
        data: ProductFactory.build({ stock: 5, priceCents: 10_000 }),
      });
      await api.addToCart(testUser.token, p.id, 1);
    });

    await test.step('walk to the review step and discover WELCOME10', async () => {
      await cart.goto();
      await cart.proceedToCheckout();
      await checkout.waitForAddressReady();
      await checkout.next(); // address → payment
      await checkout.next(); // payment → review

      await expect(checkout.dealsPanel()).toBeVisible();
      await expect(checkout.deal('WELCOME10')).toContainText('10% off');
    });

    await test.step('one-click apply lowers the displayed total', async () => {
      await checkout.applyDeal('WELCOME10');
      await expect(checkout.promoApplied()).toContainText('WELCOME10');
      await expect(checkout.summaryDiscount()).toHaveText(/-\$10\.00/);
      await expect(checkout.summaryTotal()).toHaveText(/\$90\.00/);
      // Panel collapses once a code is applied.
      await expect(checkout.dealsPanel()).toHaveCount(0);
    });

    await test.step('place the order and verify the discount in the DB', async () => {
      await checkout.placeOrder();
      await expect(authedPage).toHaveURL(/\/orders\/.+/);
      await expect(checkout.orderStatus()).toHaveText('PAID');

      const order = await db.order.findFirstOrThrow({
        where: { userId: testUser.id },
        orderBy: { createdAt: 'desc' },
        include: { promoCode: true },
      });
      expect(order.discountCents).toBe(1_000);
      expect(order.totalCents).toBe(9_000);
      expect(order.promoCode?.code).toBe('WELCOME10');

      await expect
        .poll(() =>
          db.auditLog.count({
            where: { action: 'PROMO_REDEEMED', userId: testUser.id },
          }),
        )
        .toBe(1);
    });
  });

  test('a deal below its minimum spend shows as locked, not applyable', {
    tag: ['@regression', '@promo', '@boundary'],
  }, async ({ authedPage, api, db, testUser, cart, checkout }) => {
    // BIG20 requires a $50 minimum — a $30 cart should show it locked.
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 5, priceCents: 3_000 }),
    });
    await api.createAddress(testUser.token, AddressFactory.build({ isDefault: true }));
    await api.addToCart(testUser.token, product.id, 1);

    await cart.goto();
    await cart.proceedToCheckout();
    await checkout.waitForAddressReady();
    await checkout.next();
    await checkout.next();

    await expect(checkout.dealsPanel()).toBeVisible();
    await expect(checkout.dealLocked('BIG20')).toContainText(/Spend \$50\.00/);
    // No apply control is rendered for a locked deal.
    await expect(checkout.deal('BIG20').getByRole('button', { name: 'Apply' })).toHaveCount(0);
  });
});
