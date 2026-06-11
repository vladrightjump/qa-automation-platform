// Phase 15c — admin sales metrics page.
import { test, expect } from '../fixtures';

test.describe('admin sales metrics (UI)', () => {
  // Every test in this describe block seeds a paid order against
  // prod_widget. The seeded stock (50) is shared across the parallel
  // suite; cart/checkout specs that run alongside can drain it. Top
  // it back up so checkout doesn't 400 with "Insufficient stock".
  test.beforeEach(async ({ db }) => {
    await db.product.update({
      where: { id: 'prod_widget' },
      data: { stock: 50 },
    });
  });

  test('admin sees revenue cards and the top-products table after a paid order', {
    tag: ['@regression', '@metrics', '@admin'],
  }, async ({ api, testUser, adminPage }) => {
    // Place a paid order so the metrics page has something to display.
    await api.addToCart(testUser.token, 'prod_widget', 2);
    await api.checkout(testUser.token, { paymentMethod: 'CARD' });

    await adminPage.goto('/admin/metrics');
    await expect(adminPage.getByTestId('admin-metrics')).toBeVisible();
    await expect(adminPage.getByTestId('metric-card-revenue')).toBeVisible();
    await expect(adminPage.getByTestId('metric-card-orders')).toBeVisible();
    await expect(adminPage.getByTestId('metric-card-aov')).toBeVisible();
    await expect(adminPage.getByTestId('metrics-top-products')).toBeVisible();
  });

  test('dev-only X-Cache chip toggles miss → hit on consecutive submits', {
    tag: ['@regression', '@metrics', '@cache', '@admin'],
  }, async ({ api, testUser, adminPage }) => {
    // Seed a paid order so the cards aren't trivially zero.
    await api.addToCart(testUser.token, 'prod_widget', 1);
    await api.checkout(testUser.token, { paymentMethod: 'CARD' });

    // Pick an unusual range so this spec doesn't share cache entries with
    // sibling specs (the page submits Date inputs as ISO ranges).
    const today = new Date();
    const longAgo = new Date(today.getTime() - 200 * 86_400_000);
    const isoFrom = longAgo.toISOString().slice(0, 10);
    const isoTo = today.toISOString().slice(0, 10);

    await adminPage.goto('/admin/metrics');
    await adminPage.getByTestId('metrics-from').fill(isoFrom);
    await adminPage.getByTestId('metrics-to').fill(isoTo);

    await adminPage.getByTestId('metrics-submit').click();
    const chip = adminPage.getByTestId('cache-state-chip');
    await expect(chip).toHaveAttribute('data-cache-state', 'miss');

    await adminPage.getByTestId('metrics-submit').click();
    await expect(chip).toHaveAttribute('data-cache-state', 'hit');
  });
});
