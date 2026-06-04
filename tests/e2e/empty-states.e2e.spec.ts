// Empty-state showcase: every "nothing here yet" surface a fresh user can
// hit, asserted in isolation so the test:empty count grows by six.
//
// Four surfaces have a dedicated EmptyState in the web app (cart, wishlist,
// orders, addresses). The remaining two — stock-alerts and loyalty — have
// no standalone list page, so they're asserted at the API boundary on the
// same fresh-user shape. Accessible-tree only: no visual snapshot dep.
import { test, expect } from '../fixtures';

test.describe('empty states (fresh user)', () => {
  test(
    'cart page shows the empty-cart hero',
    { tag: ['@empty', '@regression', '@sanity'] },
    async ({ authedPage }) => {
      await authedPage.goto('/cart');
      await expect(
        authedPage.getByRole('heading', { name: 'Your cart is empty' }),
      ).toBeVisible();
    },
  );

  test(
    'wishlist page shows the empty-wishlist placeholder',
    { tag: ['@empty', '@regression'] },
    async ({ authedPage }) => {
      await authedPage.goto('/wishlist');
      await expect(authedPage.getByTestId('wishlist-empty')).toBeVisible();
    },
  );

  test(
    'orders page shows the no-orders-yet placeholder',
    { tag: ['@empty', '@regression'] },
    async ({ authedPage }) => {
      await authedPage.goto('/orders');
      await expect(authedPage.getByTestId('orders-empty')).toBeVisible();
    },
  );

  test(
    'addresses page shows the empty-addresses placeholder',
    { tag: ['@empty', '@regression'] },
    async ({ authedPage }) => {
      await authedPage.goto('/account/addresses');
      await expect(authedPage.getByTestId('addresses-empty')).toBeVisible();
    },
  );

  test(
    'stock-alerts API returns an empty list',
    { tag: ['@empty', '@regression'] },
    async ({ api, testUser }) => {
      // No standalone list page — subscribe lives on product detail. A
      // fresh user has none subscribed, asserted at the API boundary.
      const alerts = await api.listStockAlerts(testUser.token);
      expect(alerts).toEqual([]);
    },
  );

  test(
    'loyalty ledger starts at zero balance',
    { tag: ['@empty', '@regression'] },
    async ({ api, testUser }) => {
      // The redemption surface lives on /checkout, not a standalone page,
      // so empty = zeroed ledger on a fresh user.
      const loyalty = await api.getLoyalty(testUser.token);
      expect(loyalty.balancePoints).toBe(0);
    },
  );
});
