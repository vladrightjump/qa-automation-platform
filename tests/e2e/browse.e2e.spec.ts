import { test, expect } from '../fixtures';
import { StorefrontPage } from '../pages/storefront.page';

test.describe('browse', () => {
  test('@smoke product list shows seeded products', async ({ authedPage }) => {
    const storefront = new StorefrontPage(authedPage);
    await storefront.goto();
    await expect(storefront.productCard('prod_widget')).toBeVisible();
    await expect(storefront.productCard('prod_gizmo')).toBeVisible();
    await expect(storefront.productCard('prod_thingamajig')).toBeVisible();
  });

  test('@regression product detail page loads via card link', async ({ authedPage }) => {
    await authedPage.goto('/products/prod_widget');
    await expect(authedPage.getByTestId('product-card-prod_widget')).toBeVisible();
    await expect(authedPage.getByTestId('add-to-cart-prod_widget')).toBeEnabled();
  });
});
