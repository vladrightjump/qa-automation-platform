import { test, expect } from '../fixtures';
import { ProductFactory } from '../factories/product.factory';
import { AddressFactory } from '../factories/address.factory';

test.describe('checkout wizard (UI)', () => {
  test('applying WELCOME10 in the review step lowers the displayed total', {
    tag: ['@smoke', '@checkout', '@promo'],
  }, async ({
    authedPage,
    api,
    db,
    testUser,
    cart,
    checkout,
  }) => {
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 5, priceCents: 10_000 }),
    });
    await api.createAddress(
      testUser.token,
      AddressFactory.build({ isDefault: true }),
    );
    await api.addToCart(testUser.token, product.id, 1);

    await cart.goto();
    await cart.proceedToCheckout();
    await checkout.waitForAddressReady();
    await checkout.next();
    await checkout.next();

    await expect(checkout.summaryTotal()).toHaveText(/\$100\.00/);
    await checkout.applyPromo('WELCOME10');
    await expect(checkout.summaryDiscount()).toHaveText(/-\$10\.00/);
    await expect(checkout.summaryTotal()).toHaveText(/\$90\.00/);

    // Remove and total restores.
    await checkout.removePromo();
    await expect(checkout.summaryDiscount()).toHaveText(/-\$0\.00/);
    await expect(checkout.summaryTotal()).toHaveText(/\$100\.00/);
  });

  test('invalid promo shows an inline error and does not apply', {
    tag: ['@regression', '@checkout', '@promo'],
  }, async ({
    authedPage,
    api,
    db,
    testUser,
    checkout,
  }) => {
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 2, priceCents: 2000 }),
    });
    await api.createAddress(
      testUser.token,
      AddressFactory.build({ isDefault: true }),
    );
    await api.addToCart(testUser.token, product.id, 1);

    await checkout.goto();
    await checkout.waitForAddressReady();
    await checkout.next();
    await checkout.next();
    await checkout.applyPromo('NOPE');
    await expect(
      authedPage.getByTestId('checkout-promo-error'),
    ).toBeVisible();
    await expect(checkout.summaryDiscount()).toHaveText(/-\$0\.00/);
  });

  test('payment step COD hides card fields', {
    tag: ['@regression', '@checkout'],
  }, async ({
    authedPage,
    api,
    testUser,
    checkout,
  }) => {
    await api.createAddress(
      testUser.token,
      AddressFactory.build({ isDefault: true }),
    );
    await checkout.goto();
    await checkout.waitForAddressReady();
    await checkout.next();
    await expect(authedPage.getByTestId('checkout-card-fields')).toBeVisible();
    await checkout.pickPayment('COD');
    await expect(authedPage.getByTestId('checkout-card-fields')).toHaveCount(0);
  });

  test('validation blocks Next on the new-address step when required fields are empty', {
    tag: ['@regression', '@checkout'],
  }, async ({
    authedPage,
    api,
    testUser,
    checkout,
  }) => {
    // Force the "use new address" form: delete any saved addresses first.
    const list = await api.listAddresses(testUser.token);
    for (const a of list) await api.deleteAddress(testUser.token, a.id);

    await checkout.goto();
    // No saved addresses → the new-address form renders inline. Assert
    // it is visible (web-first) before clicking Next.
    await expect(authedPage.getByTestId('checkout-new-line1')).toBeVisible();
    await checkout.next();
    await expect(
      authedPage.getByTestId('checkout-new-name-error'),
    ).toBeVisible();
    await expect(
      authedPage.getByTestId('checkout-new-line1-error'),
    ).toBeVisible();
  });
});
