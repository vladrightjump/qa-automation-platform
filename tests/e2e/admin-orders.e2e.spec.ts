import { test, expect } from '../fixtures';
import { seedPaidOrder } from '../support/seed';

test.describe('admin order management (UI)', () => {
  test('admin fulfils a PAID order from the orders dashboard', {
    tag: ['@smoke', '@admin-orders', '@sanity'],
  }, async ({ adminPage, api, db, testUser }) => {
    // A customer places a PAID order.
    const order = await seedPaidOrder(api, db, {
      token: testUser.token,
      priceCents: 1800,
      stock: 4,
    });

    await adminPage.goto('/admin/orders');
    // Filter to PAID to narrow the global list to the relevant row.
    await adminPage.getByTestId('admin-orders-filter-PAID').click();

    const fulfill = adminPage.getByTestId(`admin-order-fulfill-${order.id}`);
    await expect(fulfill).toBeVisible();
    await fulfill.click();

    // Side-effect: the order reaches FULFILLED.
    await expect
      .poll(() =>
        db.order
          .findUnique({ where: { id: order.id } })
          .then((o) => o?.status),
      )
      .toBe('FULFILLED');
  });

  test('admin approves then refunds a return', {
    tag: ['@regression', '@admin-orders'],
  }, async ({ adminPage, api, db, testUser }) => {
    const order = await seedPaidOrder(api, db, {
      token: testUser.token,
      priceCents: 3000,
      stock: 4,
    });
    const ret = await api.requestReturn(testUser.token, order.id, 'Damaged box');

    await adminPage.goto('/admin/orders');

    const status = adminPage.getByTestId(`admin-return-status-${ret.id}`);
    await adminPage.getByTestId(`admin-return-approve-${ret.id}`).click();
    await expect(status).toHaveText('APPROVED');

    await adminPage.getByTestId(`admin-return-refund-${ret.id}`).click();
    await expect(status).toHaveText('REFUNDED');

    await expect
      .poll(() =>
        db.return.findUnique({ where: { id: ret.id } }).then((r) => r?.status),
      )
      .toBe('REFUNDED');
  });
});
