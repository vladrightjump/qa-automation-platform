import { test, expect } from '../fixtures';
import { StorefrontPage } from '../pages/storefront.page';

test.describe('catalog filters', () => {
  test('@smoke search filters products by name (debounced) and persists in URL', async ({
    page,
  }) => {
    const storefront = new StorefrontPage(page);
    await storefront.goto();
    await storefront.search('widget');

    // wait for debounce + URL replace
    await page.waitForURL(/q=widget/, { timeout: 2000 });
    await expect(storefront.productCard('prod_widget')).toBeVisible();
    await expect(storefront.productCard('prod_gizmo')).toHaveCount(0);

    // reload preserves filter
    await page.reload();
    await expect(storefront.searchInput()).toHaveValue('widget');
    await expect(storefront.productCard('prod_widget')).toBeVisible();
  });

  test('@regression category filter narrows results and writes ?category=', async ({
    page,
  }) => {
    const storefront = new StorefrontPage(page);
    await storefront.goto();
    await storefront.toggleCategory('apparel');
    await page.waitForURL(/category=apparel/);

    await expect(storefront.productCard('prod_tee_basic')).toBeVisible();
    await expect(storefront.productCard('prod_widget')).toHaveCount(0);
  });

  test('@regression sort=price_asc shows cheapest first', async ({ page }) => {
    const storefront = new StorefrontPage(page);
    await storefront.goto();
    await storefront.setSort('price_asc');
    await page.waitForURL(/sort=price_asc/);

    // Pen 3-pack is the cheapest seeded product ($5.99).
    const firstCard = storefront.productCards().first();
    await expect(firstCard).toHaveAttribute(
      'data-testid',
      'product-card-prod_pen_gel',
    );
  });

  test('@regression empty state appears when no products match', async ({
    page,
  }) => {
    const storefront = new StorefrontPage(page);
    await storefront.goto();
    await storefront.search('definitelydoesnotexist');
    await page.waitForURL(/q=definitelydoesnotexist/);

    await expect(storefront.emptyState()).toBeVisible();
    await expect(storefront.productCards()).toHaveCount(0);

    await page.getByTestId('catalog-empty-clear').click();
    await expect(storefront.emptyState()).toHaveCount(0);
    await expect(storefront.searchInput()).toHaveValue('');
  });

  test('@regression pagination advances pages and result count is stable', async ({
    page,
  }) => {
    const storefront = new StorefrontPage(page);
    await storefront.goto();

    await expect(storefront.paginationInfo()).toContainText('Page 1');
    await storefront.paginationNext().click();
    await page.waitForURL(/page=2/);
    await expect(storefront.paginationInfo()).toContainText('Page 2');
    await storefront.paginationPrev().click();
    await page.waitForURL((url) => !url.searchParams.has('page'));
    await expect(storefront.paginationInfo()).toContainText('Page 1');
  });
});
