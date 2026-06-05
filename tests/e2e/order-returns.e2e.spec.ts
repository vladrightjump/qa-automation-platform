import { test, expect } from '../fixtures';
import { seedPaidOrder } from '../support/seed';

test.describe('order returns (UI)', () => {
  test('request a return from the order detail page → status badge', {
    tag: ['@smoke', '@returns', '@sanity'],
  }, async ({ authedPage, api, db, testUser }) => {
    const order = await seedPaidOrder(api, db, {
      token: testUser.token,
      priceCents: 1500,
      stock: 3,
    });

    await authedPage.goto(`/orders/${order.id}`);

    await authedPage.getByTestId('order-return').click();
    await expect(authedPage.getByTestId('order-return-modal')).toBeVisible();
    await authedPage
      .getByTestId('order-return-reason')
      .fill('Item arrived damaged');
    await authedPage.getByTestId('order-return-submit').click();

    const badge = authedPage.getByTestId('order-return-status');
    await expect(badge).toBeVisible();
    await expect(badge).toHaveAttribute('data-status', 'REQUESTED');
    // Request button is gone once an open return exists.
    await expect(authedPage.getByTestId('order-return')).toHaveCount(0);

    // Ground-truth side-effect: a return row exists for this order.
    await expect
      .poll(() => db.return.count({ where: { orderId: order.id } }))
      .toBe(1);
  });

  test('a cancelled order cannot be returned', {
    tag: ['@regression', '@returns', '@negative'],
  }, async ({ authedPage, api, db, testUser }) => {
    const order = await seedPaidOrder(api, db, {
      token: testUser.token,
      priceCents: 1000,
      stock: 2,
    });
    await api.cancelOrder(testUser.token, order.id);

    await authedPage.goto(`/orders/${order.id}`);
    await expect(authedPage.getByTestId('order-return')).toHaveCount(0);
  });
});
