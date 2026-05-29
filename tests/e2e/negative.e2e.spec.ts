// Negative UI paths: unauthenticated access, out-of-stock, validation messaging.
import { test, expect } from '../fixtures';

test.describe('negative paths (UI)', () => {
  test('unauthenticated /cart redirects to /login', {
    tag: ['@regression', '@auth'],
  }, async ({ page }) => {
    await page.goto('/cart');
    await expect(page).toHaveURL(/\/login(\?.*)?$/);
    await expect(page.getByTestId('auth-email')).toBeVisible();
  });

  test('out-of-stock product shows disabled "Out of stock" button', {
    tag: ['@regression', '@catalog'],
  }, async ({
    authedPage,
  }) => {
    // Navigate directly to the OOS sample's detail page — the home grid
    // paginates so it may not be on the first page.
    await authedPage.goto('/products/prod_oos');
    const card = authedPage.getByTestId('product-card-prod_oos');
    await expect(card).toBeVisible();
    const btn = authedPage.getByTestId('add-to-cart-prod_oos');
    await expect(btn).toBeDisabled();
    await expect(btn).toHaveText(/Out of stock/i);
  });

  test('login form rejects invalid credentials with a toast', {
    tag: ['@regression', '@auth'],
  }, async ({
    page,
  }) => {
    await page.goto('/login');
    await page.getByTestId('auth-email').fill('ghost@qa-test.local');
    await page.getByTestId('auth-password').fill('not-the-password');
    await page.getByTestId('auth-submit').click();
    await expect(page.getByTestId('toast-error')).toBeVisible();
  });
});
