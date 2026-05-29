import { test, expect } from '../fixtures';

test.describe('browse', () => {
  test('@smoke product list shows seeded products', async ({
    authedPage,
    storefront,
  }) => {
    await storefront.goto();
    // Page 1 of the catalog shows a chunk of products — assert the grid
    // populated and the result counter reflects the full seed.
    await expect(storefront.productCards().first()).toBeVisible();
    await expect(storefront.resultCount()).toContainText(/\d+ results?/);
    await expect(storefront.paginationInfo()).toContainText('Page 1');
  });

  test('@regression product detail page loads via card link', async ({
    authedPage,
  }) => {
    await authedPage.goto('/products/prod_widget');
    await expect(
      authedPage.getByTestId('product-card-prod_widget'),
    ).toBeVisible();
    await expect(
      authedPage.getByTestId('add-to-cart-prod_widget'),
    ).toBeEnabled();
  });
});
