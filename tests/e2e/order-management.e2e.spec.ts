import { test, expect } from '../fixtures';
import { AddressFactory } from '../factories/address.factory';
import { ProductFactory } from '../factories/product.factory';

test.describe('orders list filter + cancel (UI)', () => {
  test('status filter tabs narrow the orders list', {
    tag: ['@smoke', '@orders', '@sanity'],
  }, async ({
    authedPage,
    api,
    db,
    testUser,
  }) => {
    // Create one paid order so we have something in the list.
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 3, priceCents: 1000 }),
    });
    await api.createAddress(
      testUser.token,
      AddressFactory.build({ isDefault: true }),
    );
    await api.addToCart(testUser.token, product.id, 1);
    const order = await api.checkout(testUser.token);

    await authedPage.goto('/orders');
    await expect(
      authedPage.getByTestId(`orders-row-${order.id}`),
    ).toBeVisible();

    // Switching to Cancelled hides the paid order.
    await authedPage.getByTestId('orders-filter-CANCELLED').click();
    await expect(
      authedPage.getByTestId(`orders-row-${order.id}`),
    ).toHaveCount(0);

    // Switching back to All restores it.
    await authedPage.getByTestId('orders-filter-all').click();
    await expect(
      authedPage.getByTestId(`orders-row-${order.id}`),
    ).toBeVisible();
  });

  test('cancel button on a PAID order transitions to CANCELLED via modal', {
    tag: ['@regression', '@orders'],
  }, async ({
    authedPage,
    api,
    db,
    testUser,
  }) => {
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 2, priceCents: 1500 }),
    });
    await api.createAddress(
      testUser.token,
      AddressFactory.build({ isDefault: true }),
    );
    await api.addToCart(testUser.token, product.id, 1);
    const order = await api.checkout(testUser.token);

    await authedPage.goto(`/orders/${order.id}`);
    await expect(authedPage.getByTestId('order-cancel')).toBeVisible();
    await authedPage.getByTestId('order-cancel').click();
    await expect(authedPage.getByTestId('order-cancel-modal')).toBeVisible();
    await authedPage.getByTestId('order-cancel-confirm').click();
    await expect(authedPage.getByTestId('order-status')).toHaveText(
      'CANCELLED',
    );
    await expect(
      authedPage.getByTestId('order-timeline-cancelled'),
    ).toBeVisible();
    // Cancel button gone after cancellation.
    await expect(authedPage.getByTestId('order-cancel')).toHaveCount(0);
  });

  test('order id search narrows the list to a single row', {
    tag: ['@regression', '@orders'],
  }, async ({
    authedPage,
    api,
    db,
    testUser,
  }) => {
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 3, priceCents: 800 }),
    });
    await api.createAddress(
      testUser.token,
      AddressFactory.build({ isDefault: true }),
    );
    // Place two orders so search has something to narrow.
    await api.addToCart(testUser.token, product.id, 1);
    const o1 = await api.checkout(testUser.token);
    await api.addToCart(testUser.token, product.id, 1);
    const o2 = await api.checkout(testUser.token);

    await authedPage.goto('/orders');
    await authedPage.getByTestId('orders-search').fill(o1.id);
    await expect(authedPage.getByTestId(`orders-row-${o1.id}`)).toBeVisible();
    await expect(authedPage.getByTestId(`orders-row-${o2.id}`)).toHaveCount(0);
  });
});
