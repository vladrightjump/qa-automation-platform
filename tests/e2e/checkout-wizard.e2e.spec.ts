import { test, expect } from '../fixtures';
import { ProductFactory } from '../factories/product.factory';
import { AddressFactory } from '../factories/address.factory';
import { CheckoutPage } from '../pages/checkout.page';
import { CartPage } from '../pages/cart.page';

test.describe('checkout wizard (UI)', () => {
  test('@smoke applying WELCOME10 in the review step lowers the displayed total', async ({
    authedPage,
    api,
    db,
    testUser,
  }) => {
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 5, priceCents: 10_000 }),
    });
    await api.createAddress(
      testUser.token,
      AddressFactory.build({ isDefault: true }),
    );
    await api.addToCart(testUser.token, product.id, 1);

    const cart = new CartPage(authedPage);
    const checkout = new CheckoutPage(authedPage);

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

  test('@regression invalid promo shows an inline error and does not apply', async ({
    authedPage,
    api,
    db,
    testUser,
  }) => {
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 2, priceCents: 2000 }),
    });
    await api.createAddress(
      testUser.token,
      AddressFactory.build({ isDefault: true }),
    );
    await api.addToCart(testUser.token, product.id, 1);

    const checkout = new CheckoutPage(authedPage);
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

  test('@regression payment step COD hides card fields', async ({
    authedPage,
    api,
    testUser,
  }) => {
    await api.createAddress(
      testUser.token,
      AddressFactory.build({ isDefault: true }),
    );
    const checkout = new CheckoutPage(authedPage);
    await checkout.goto();
    await checkout.waitForAddressReady();
    await checkout.next();
    await expect(authedPage.getByTestId('checkout-card-fields')).toBeVisible();
    await checkout.pickPayment('COD');
    await expect(authedPage.getByTestId('checkout-card-fields')).toHaveCount(0);
  });

  test('@regression validation blocks Next on the new-address step when required fields are empty', async ({
    authedPage,
    api,
    testUser,
  }) => {
    // Force the "use new address" form: delete any saved addresses first.
    const list = await api.listAddresses(testUser.token);
    for (const a of list) await api.deleteAddress(testUser.token, a.id);

    const checkout = new CheckoutPage(authedPage);
    await checkout.goto();
    // No saved addresses → the new-address form renders inline. Wait
    // for the form to appear before clicking Next.
    await authedPage.getByTestId('checkout-new-line1').waitFor();
    await checkout.next();
    await expect(
      authedPage.getByTestId('checkout-new-name-error'),
    ).toBeVisible();
    await expect(
      authedPage.getByTestId('checkout-new-line1-error'),
    ).toBeVisible();
  });
});
