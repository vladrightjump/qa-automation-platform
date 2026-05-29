// Hybrid spec: state seeded via API + DB, flow driven through the browser via
// Page Objects, ground truth verified in the DB.
//
// Showcase notes:
//   - `test.step(...)` groups logical phases — they appear as nested entries
//     in the HTML report, making long flows readable at a glance.
//   - `toHaveCartCount(n)` is a custom expect matcher (see support/matchers.ts).
//   - `expect.poll(...)` waits on the DB for the audit-log side-effect rather
//     than guessing at a sleep.
import { test, expect } from '../fixtures';
import { ProductFactory } from '../factories/product.factory';
import { AddressFactory } from '../factories/address.factory';

test.describe('checkout (UI)', () => {
  test('complete flow: browse → cart → checkout wizard → confirmation + DB row', {
    tag: ['@smoke', '@checkout', '@sanity'],
  }, async ({
    authedPage,
    api,
    db,
    testUser,
    storefront,
    cart,
    checkout,
  }) => {
    const product = await test.step('seed: default address + fresh product', async () => {
      await api.createAddress(
        testUser.token,
        AddressFactory.build({ isDefault: true }),
      );
      return db.product.create({
        data: ProductFactory.build({
          stock: 5,
          priceCents: 1200,
          name: 'Test Widget',
        }),
      });
    });

    await test.step('add product to cart from the detail page', async () => {
      // The home grid paginates by name, so factory products with random
      // names may not land on page 1 — go directly to detail.
      await authedPage.goto(`/products/${product.id}`);
      await expect(storefront.productCard(product.id)).toBeVisible();
      await storefront.addToCart(product.id);
      await expect(authedPage).toHaveCartCount(1);
    });

    await test.step('verify cart line subtotal', async () => {
      await cart.goto();
      await expect(cart.item(product.id)).toBeVisible();
      await expect(cart.subtotal()).toHaveText(/\$12\.00/);
    });

    await test.step('walk the 3-step checkout wizard', async () => {
      await cart.proceedToCheckout();
      await checkout.waitForAddressReady();
      await checkout.next(); // address → payment
      await checkout.next(); // payment → review
      await checkout.placeOrder();
      await expect(authedPage).toHaveURL(/\/orders\/.+/);
      await expect(checkout.orderStatus()).toHaveText('PAID');
    });

    await test.step('verify DB side-effects (audit log + stock decrement)', async () => {
      await expect
        .poll(
          () =>
            db.auditLog.count({
              where: { userId: testUser.id, action: 'ORDER_PAID' },
            }),
          { timeout: 5_000 },
        )
        .toBe(1);
      const updatedProduct = await db.product.findUniqueOrThrow({
        where: { id: product.id },
      });
      expect(updatedProduct.stock).toBe(4);
    });
  });

  test('remove-from-cart updates subtotal and DB', {
    tag: ['@regression', '@cart'],
  }, async ({
    authedPage,
    api,
    db,
    testUser,
    cart,
  }) => {
    const a = await db.product.create({
      data: ProductFactory.build({ stock: 5, priceCents: 1000 }),
    });
    const b = await db.product.create({
      data: ProductFactory.build({ stock: 5, priceCents: 2000 }),
    });
    await api.addToCart(testUser.token, a.id, 1);
    await api.addToCart(testUser.token, b.id, 1);

    await cart.goto();
    // Soft assertions — surface all three failures at once if the cart
    // page ever returns to an inconsistent state, instead of one-at-a-time.
    await expect.soft(cart.item(a.id)).toBeVisible();
    await expect.soft(cart.item(b.id)).toBeVisible();
    await expect.soft(cart.subtotal()).toHaveText(/\$30\.00/);

    await cart.removeItem(a.id);
    await expect(cart.item(a.id)).not.toBeVisible();
    await expect(cart.subtotal()).toHaveText(/\$20\.00/);

    // DB confirms only `b` remains in the cart.
    const items = await db.cartItem.findMany({
      where: { cart: { userId: testUser.id } },
    });
    expect(items).toHaveLength(1);
    expect(items[0]?.productId).toBe(b.id);
  });
});
