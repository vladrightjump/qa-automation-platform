// Phase 15b — recommendations carousel on the home + cart routes.
// The authed user with a paid order sees the <Recommendations> grid,
// grouped by kind. Unauthed users see the original <RecentlyViewed>
// strip (verified by negative path).
import { test, expect } from '../fixtures';

test.describe('recommendations (UI)', () => {
  test('authed user with a paid order sees same-category recommendations on /', {
    tag: ['@regression', '@recommendations'],
  }, async ({ api, testUser, authedPage }) => {
    await api.addToCart(testUser.token, 'prod_widget', 1);
    await api.checkout(testUser.token, { paymentMethod: 'CARD' });
    await api.refreshRecommendationView();

    await authedPage.goto('/');
    const recs = authedPage.getByTestId('recommendations');
    await expect(recs).toBeVisible();

    const sameCategory = authedPage.getByTestId('recommendation-row-same-category');
    await expect(sameCategory).toBeVisible();
  });

  test('clicking a recommendation routes to the product detail page', {
    tag: ['@regression', '@recommendations'],
  }, async ({ api, testUser, authedPage }) => {
    await api.addToCart(testUser.token, 'prod_widget', 1);
    await api.checkout(testUser.token, { paymentMethod: 'CARD' });
    await api.refreshRecommendationView();

    await authedPage.goto('/');
    const recs = authedPage.getByTestId('recommendations');
    await expect(recs).toBeVisible();

    // Pick the first item inside the same-category row.
    const firstItem = recs
      .getByTestId('recommendation-row-same-category')
      .locator('[data-testid^="recommendation-item-"]')
      .first();
    await expect(firstItem).toBeVisible();
    const testIdAttr = await firstItem.getAttribute('data-testid');
    const productId = testIdAttr?.replace('recommendation-item-', '') ?? '';
    expect(productId).toMatch(/^[a-z0-9_]+$/);

    await firstItem.click();
    await expect(authedPage).toHaveURL(new RegExp(`/products/${productId}$`));
  });

  test('unauthed user falls back to the RecentlyViewed strip on /', {
    tag: ['@regression', '@recommendations'],
  }, async ({ page }) => {
    // Seed localStorage so the RecentlyViewed strip has something to show.
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'qa_recently_viewed',
        JSON.stringify(['prod_widget']),
      );
    });
    await page.goto('/');
    await expect(page.getByTestId('recently-viewed')).toBeVisible();
    await expect(page.getByTestId('recommendations')).not.toBeVisible();
  });
});
