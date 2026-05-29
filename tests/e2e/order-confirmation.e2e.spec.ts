import { test, expect } from '../fixtures';
import { ProductFactory } from '../factories/product.factory';
import { AddressFactory } from '../factories/address.factory';

test.describe('order confirmation (UI)', () => {
  test('@smoke checkout flow lands on the confirmation hero', async ({
    authedPage,
    api,
    db,
    testUser,
    cart,
    checkout,
  }) => {
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 3, priceCents: 1500 }),
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
    await checkout.placeOrder();

    // The checkout submit routes to /orders/:id?just=1 which triggers
    // the celebratory hero + confetti.
    await expect(authedPage).toHaveURL(/\/orders\/.+\?just=1$/);
    await expect(
      authedPage.getByTestId('order-confirmation-hero'),
    ).toBeVisible();
    await expect(
      authedPage.getByTestId('order-confirmation-title'),
    ).toContainText('Order confirmed');
    await expect(
      authedPage.getByTestId('order-confirmation-continue'),
    ).toBeVisible();
  });
});
