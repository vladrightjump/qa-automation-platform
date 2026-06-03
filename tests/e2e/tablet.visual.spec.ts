// Visual baselines for the localized storefront at tablet width.
// Runs only in the `tablet-visual` project (iPad descriptor) so phone /
// desktop snapshot diffs don't pile up in unrelated PRs.
//
// Mask dynamic regions (toast queue, geo banner, factory product cards) so
// the diff is driven by the deterministic localized layout.
//
// Update baselines deliberately: pnpm test:update-snapshots
import { test, expect } from '../fixtures';

test.describe('tablet — localized storefront visual baselines', () => {
  test('en-US storefront at tablet width', async ({ page }) => {
    await page.goto('/?category=gadgets');
    await page.locator('[data-testid^="product-card-prod_"]').first().waitFor();

    await expect(page).toHaveScreenshot('tablet-storefront-en-US.png', {
      fullPage: false,
      mask: [
        page.getByTestId('toast-queue'),
        page.getByTestId('geo-banner'),
        page.getByTestId('geo-fallback'),
      ],
      maskColor: '#ddd',
    });
  });

  test('de-DE storefront at tablet width', async ({ page }) => {
    await page.goto('/?category=gadgets');
    await page.locator('[data-testid^="product-card-prod_"]').first().waitFor();

    // Switch locale via the navbar so the snapshot captures the German
    // strings + EUR formatting at tablet width.
    await page.getByTestId('locale-switcher').selectOption('de-DE');
    // Wait for the German nav label to settle before the screenshot.
    await expect(page.getByTestId('nav-cart-label')).toHaveText('Warenkorb');

    await expect(page).toHaveScreenshot('tablet-storefront-de-DE.png', {
      fullPage: false,
      mask: [
        page.getByTestId('toast-queue'),
        page.getByTestId('geo-banner'),
        page.getByTestId('geo-fallback'),
      ],
      maskColor: '#ddd',
    });
  });
});
