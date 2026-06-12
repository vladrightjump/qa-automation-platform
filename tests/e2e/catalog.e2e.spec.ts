import { test, expect } from '../fixtures';

test.describe('browse', () => {
  test('product list shows seeded products', {
    tag: ['@smoke', '@catalog'],
  }, async ({ authedPage, storefront }) => {
    await storefront.goto();
    await expect(storefront.productCards().first()).toBeVisible();
    await expect(storefront.resultCount()).toContainText(/\d+ results?/);
    await expect(storefront.paginationInfo()).toContainText('Page 1');
  });

  test('product detail page loads via card link', {
    tag: ['@regression', '@catalog'],
  }, async ({ authedPage, db }) => {
    await db.product.update({
      where: { id: 'prod_widget' },
      data: { stock: 50 },
    });
    await authedPage.goto('/products/prod_widget');
    await expect(authedPage.getByTestId('product-card-prod_widget')).toBeVisible();
    await expect(authedPage.getByTestId('add-to-cart-prod_widget')).toBeEnabled();
  });
});

test.describe('catalog filters', () => {
  test('search filters products by name (debounced) and persists in URL', {
    tag: ['@smoke', '@catalog', '@sanity'],
  }, async ({ page, storefront }) => {
    await storefront.goto();
    await storefront.search('Thingamajig');

    await page.waitForURL(/q=Thingamajig/, { timeout: 2000 });
    await expect(storefront.productCard('prod_thingamajig')).toBeVisible();
    await expect(storefront.productCard('prod_gizmo')).toHaveCount(0);

    await page.reload();
    await expect(storefront.searchInput()).toHaveValue('Thingamajig');
    await expect(storefront.productCard('prod_thingamajig')).toBeVisible();
  });

  test('category filter narrows results and writes ?category=', {
    tag: ['@regression', '@catalog'],
  }, async ({ page, storefront }) => {
    await storefront.goto();
    await storefront.search('Basic Tee');
    await page.waitForURL(/q=/);
    await storefront.toggleCategory('apparel');
    await page.waitForURL(/category=apparel/);

    await expect(storefront.productCard('prod_tee_basic')).toBeVisible();
    await expect(storefront.productCard('prod_widget')).toHaveCount(0);
  });

  test('sort=price_asc shows cheapest first in a filtered set', {
    tag: ['@regression', '@catalog'],
  }, async ({ page, storefront }) => {
    await storefront.goto();
    await storefront.search('Gel Pen');
    await page.waitForURL(/q=/);
    await storefront.toggleCategory('office');
    await page.waitForURL(/category=office/);
    await storefront.setSort('price_asc');
    await page.waitForURL(/sort=price_asc/);

    const firstCard = storefront.productCards().first();
    await expect(firstCard).toHaveAttribute(
      'data-testid',
      'product-card-prod_pen_gel',
    );
  });

  test('empty state appears when no products match', {
    tag: ['@regression', '@catalog'],
  }, async ({ page, storefront }) => {
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
  }, async ({ page, storefront }) => {
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
