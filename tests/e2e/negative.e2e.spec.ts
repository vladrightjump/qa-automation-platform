// Negative UI paths: unauthenticated access, out-of-stock, validation messaging.
import { test, expect } from '../fixtures';
import { StorefrontPage } from '../pages/storefront.page';

test.describe('negative paths (UI)', () => {
  test('@regression unauthenticated /cart redirects to /login', async ({ page }) => {
    await page.goto('/cart');
    await expect(page).toHaveURL(/\/login(\?.*)?$/);
    await expect(page.getByTestId('auth-email')).toBeVisible();
  });

  test('@regression out-of-stock product shows disabled "Out of stock" button', async ({
    authedPage,
  }) => {
    const storefront = new StorefrontPage(authedPage);
    await storefront.goto();
    const card = storefront.productCard('prod_oos');
    await expect(card).toBeVisible();
    const btn = authedPage.getByTestId('add-to-cart-prod_oos');
    await expect(btn).toBeDisabled();
    await expect(btn).toHaveText(/Out of stock/i);
  });

  test('@regression login form rejects invalid credentials with a toast', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.getByTestId('auth-email').fill('ghost@qa-test.local');
    await page.getByTestId('auth-password').fill('not-the-password');
    await page.getByTestId('auth-submit').click();
    await expect(page.getByTestId('toast-error')).toBeVisible();
  });
});
