import { test, expect } from '../fixtures';
import { ProductFactory } from '../factories/product.factory';
import { AddressFactory } from '../factories/address.factory';

test.describe('checkout (UI)', () => {
  test('complete flow with seeded address → confirmation hero + DB row', {
    tag: ['@smoke', '@checkout', '@sanity'],
  }, async ({ authedPage, api, db, testUser, storefront, cart }) => {
    await api.createAddress(
      testUser.token,
      AddressFactory.build({ isDefault: true }),
    );
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 5, priceCents: 1200, name: 'Test Widget' }),
    });

    await test.step('add product to cart from the detail page', async () => {
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

    await test.step('place the order and land on the confirmation hero', async () => {
      await cart.proceedToCheckout();
      await expect(authedPage.getByTestId('checkout-address')).toBeVisible();
      await authedPage.getByTestId('checkout-submit').click();
      await expect(authedPage).toHaveURL(/\/orders\/.+\?just=1$/);
      await expect(authedPage.getByTestId('order-confirmation-hero')).toBeVisible();
      await expect(authedPage.getByTestId('order-confirmation-title')).toContainText(
        'Order confirmed',
      );
      await expect(authedPage.getByTestId('order-status')).toHaveText('PAID');
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
      const updated = await db.product.findUniqueOrThrow({ where: { id: product.id } });
      expect(updated.stock).toBe(4);
    });
  });

  test('new address typed inline at checkout creates an Address row and places the order', {
    tag: ['@regression', '@checkout', '@addresses'],
  }, async ({ authedPage, api, db, testUser, cart }) => {
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 5, priceCents: 800 }),
    });
    await api.addToCart(testUser.token, product.id, 1);

    await cart.goto();
    await cart.proceedToCheckout();

    const fresh = AddressFactory.build({ label: 'Inline' });
    await authedPage.getByTestId('checkout-new-label').fill(fresh.label);
    await authedPage.getByTestId('checkout-new-name').fill(fresh.name);
    await authedPage.getByTestId('checkout-new-line1').fill(fresh.line1);
    await authedPage.getByTestId('checkout-new-city').fill(fresh.city);
    await authedPage.getByTestId('checkout-new-postal').fill(fresh.postalCode);
    await authedPage.getByTestId('checkout-submit').click();

    await expect(authedPage).toHaveURL(/\/orders\/.+\?just=1$/);

    const created = await db.address.findMany({
      where: { userId: testUser.id, label: 'Inline' },
    });
    expect(created.length).toBe(1);
  });

  test('remove-from-cart updates subtotal and DB', {
    tag: ['@regression', '@cart'],
  }, async ({ authedPage, api, db, testUser, cart }) => {
    const a = await db.product.create({
      data: ProductFactory.build({ stock: 5, priceCents: 1000 }),
    });
    const b = await db.product.create({
      data: ProductFactory.build({ stock: 5, priceCents: 2000 }),
    });
    await api.addToCart(testUser.token, a.id, 1);
    await api.addToCart(testUser.token, b.id, 1);

    await cart.goto();
    await expect.soft(cart.item(a.id)).toBeVisible();
    await expect.soft(cart.item(b.id)).toBeVisible();
    await expect.soft(cart.subtotal()).toHaveText(/\$30\.00/);

    await cart.removeItem(a.id);
    await expect(cart.item(a.id)).not.toBeVisible();
    await expect(cart.subtotal()).toHaveText(/\$20\.00/);

    const items = await db.cartItem.findMany({
      where: { cart: { userId: testUser.id } },
    });
    expect(items).toHaveLength(1);
    expect(items[0]?.productId).toBe(b.id);
  });
});
