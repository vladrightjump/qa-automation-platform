import { test, expect } from '../fixtures';

test.describe('recently viewed (UI)', () => {
  test('@smoke visiting two product pages populates the recently-viewed strip', async ({
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

    await authedPage.goto('/');
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
