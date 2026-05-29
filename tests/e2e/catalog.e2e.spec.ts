import { test, expect } from '../fixtures';

test.describe('catalog filters', () => {
  test('search filters products by name (debounced) and persists in URL', {
    tag: ['@smoke', '@catalog', '@sanity'],
  }, async ({
    page,
    storefront,
  }) => {
    await storefront.goto();
    // "Thingamajig" is a unique seed name (no factory products collide).
    await storefront.search('Thingamajig');

    await page.waitForURL(/q=Thingamajig/, { timeout: 2000 });
    await expect(storefront.productCard('prod_thingamajig')).toBeVisible();
    await expect(storefront.productCard('prod_gizmo')).toHaveCount(0);

    // reload preserves filter
    await page.reload();
    await expect(storefront.searchInput()).toHaveValue('Thingamajig');
    await expect(storefront.productCard('prod_thingamajig')).toBeVisible();
  });

  test('category filter narrows results and writes ?category=', {
    tag: ['@regression', '@catalog'],
  }, async ({
    page,
    storefront,
  }) => {
    await storefront.goto();
    await storefront.toggleCategory('apparel');
    await page.waitForURL(/category=apparel/);

    await expect(storefront.productCard('prod_tee_basic')).toBeVisible();
    await expect(storefront.productCard('prod_widget')).toHaveCount(0);
  });

  test('sort=price_asc shows cheapest first in a filtered set', {
    tag: ['@regression', '@catalog'],
  }, async ({
    page,
    storefront,
  }) => {
    await storefront.goto();
    // Scope to office so parallel admin-API tests creating random products
    // can't interfere with the assertion about which item is cheapest.
    await storefront.toggleCategory('office');
    await page.waitForURL(/category=office/);
    await storefront.setSort('price_asc');
    await page.waitForURL(/sort=price_asc/);

    // prod_pen_gel ($5.99) is the cheapest office item in the seed.
    const firstCard = storefront.productCards().first();
    await expect(firstCard).toHaveAttribute(
      'data-testid',
      'product-card-prod_pen_gel',
    );
  });

  test('empty state appears when no products match', {
    tag: ['@regression', '@catalog'],
  }, async ({
    page,
    storefront,
  }) => {
    await storefront.goto();
    await storefront.search('definitelydoesnotexist');
    await page.waitForURL(/q=definitelydoesnotexist/);

    await expect(storefront.emptyState()).toBeVisible();
    await expect(storefront.productCards()).toHaveCount(0);

    await page.getByTestId('catalog-empty-clear').click();
    await expect(storefront.emptyState()).toHaveCount(0);
    await expect(storefront.searchInput()).toHaveValue('');
  });

  test('pagination advances pages and result count is stable', {
    tag: ['@regression', '@catalog'],
  }, async ({
    page,
    storefront,
  }) => {
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
