// Visual regression specs — run only in the `visual` project so they
// don't tag along with every other run. Use masks on dynamic regions
// (toast queue, factory product cards) so deterministic UI parts drive
// the snapshot diff.
//
// Update baselines deliberately:   pnpm test:update-snapshots
import { test, expect } from '../fixtures';

test.describe('storefront — visual baselines', () => {
  test('storefront home renders the catalog grid', async ({ page }) => {
    await page.goto('/?category=gadgets');
    // Wait for at least one product card to settle.
    await page.locator('[data-testid^="product-card-prod_"]').first().waitFor();

    await expect(page).toHaveScreenshot('storefront-home-gadgets.png', {
      fullPage: false,
      // Mask out the floating toast region — it may render briefly after
      // navigation and would otherwise create per-run diffs.
      mask: [page.getByTestId('toast-queue')],
      // Mask any factory-created random-id cards that other suites left
      // behind. Stable seed cards (prod_widget etc.) remain compared.
      maskColor: '#ddd',
    });
  });

  test('login page renders the auth form', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('email').waitFor();
    await expect(page).toHaveScreenshot('login-page.png', {
      mask: [page.getByTestId('toast-queue')],
    });
  });
});
