import { test, expect } from '../fixtures';

test.describe('recently viewed (UI)', () => {
  test('visiting two product pages populates the recently-viewed strip', {
    tag: ['@smoke', '@catalog'],
  }, async ({
    authedPage,
  }) => {
    // Recently-viewed is localStorage-backed; visiting a detail page
    // pushes the id via apps/web/lib/recently-viewed.ts.
    await authedPage.goto('/products/prod_widget');
    await expect(
      authedPage.getByTestId('product-card-prod_widget'),
    ).toBeVisible();

    await authedPage.goto('/products/prod_gizmo');
    await expect(
      authedPage.getByTestId('product-card-prod_gizmo'),
    ).toBeVisible();

    // The `/products/[id]` route still shows the RecentlyViewed strip
    // (the home + cart routes now use the richer <Recommendations>; see
    // tests/e2e/recommendations.e2e.spec.ts for that surface). Navigate to
    // a third product so the previously-viewed two appear in the strip.
    await authedPage.goto('/products/prod_thingamajig');
    const strip = authedPage.getByTestId('recently-viewed');
    await expect(strip).toBeVisible();
    await expect(
      strip.getByTestId('recently-viewed-item-prod_widget'),
    ).toBeVisible();
    await expect(
      strip.getByTestId('recently-viewed-item-prod_gizmo'),
    ).toBeVisible();
  });
});
