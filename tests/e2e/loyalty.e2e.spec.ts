import { test, expect } from '../fixtures';
import { ProductFactory } from '../factories/product.factory';
import { AddressFactory } from '../factories/address.factory';

test.describe('loyalty / store credit (UI)', () => {
  test('apply store credit at checkout reduces the total', {
    tag: ['@smoke', '@loyalty', '@sanity'],
  }, async ({ authedPage, api, db, testUser, checkout }) => {
    await api.createAddress(
      testUser.token,
      AddressFactory.build({ isDefault: true }),
    );
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 5, priceCents: 5000 }),
    });
    await api.addToCart(testUser.token, product.id, 1);
    // Seed a $10.00 (1000-point) store-credit balance.
    await db.loyaltyTransaction.create({
      data: { userId: testUser.id, points: 1000, type: 'EARN' },
    });

    await checkout.goto();
    await checkout.waitForAddressReady();
    await checkout.next(); // address → payment
    await checkout.next(); // payment → review

    await expect(authedPage.getByTestId('checkout-loyalty-balance')).toHaveText(
      /\$10\.00/,
    );
    await authedPage.getByTestId('checkout-loyalty-apply').check();
    await expect(authedPage.getByTestId('checkout-summary-loyalty')).toHaveText(
      /-\$10\.00/,
    );
    await expect(checkout.summaryTotal()).toHaveText(/\$40\.00/);

    await checkout.placeOrder();
    await expect(authedPage).toHaveURL(/\/orders\/.+/);

    // Ground-truth side-effect: a REDEEM ledger row was written.
    await expect
      .poll(() =>
        db.loyaltyTransaction.count({
          where: { userId: testUser.id, type: 'REDEEM' },
        }),
      )
      .toBe(1);
  });

  test('the store-credit control is hidden with no balance', {
    tag: ['@regression', '@loyalty'],
  }, async ({ authedPage, api, db, testUser, checkout }) => {
    await api.createAddress(
      testUser.token,
      AddressFactory.build({ isDefault: true }),
    );
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 5, priceCents: 1500 }),
    });
    await api.addToCart(testUser.token, product.id, 1);

    await checkout.goto();
    await checkout.waitForAddressReady();
    await expect(authedPage.getByTestId('checkout-loyalty')).toHaveCount(0);
  });
});
