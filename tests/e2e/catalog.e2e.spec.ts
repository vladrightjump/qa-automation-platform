import { test, expect } from '../fixtures';

test.describe('browse', () => {
  test('product list shows seeded products', {
    tag: ['@smoke', '@catalog'],
  }, async ({ authedPage, catalog }) => {
    await catalog.goto();
    await expect(catalog.productCards().first()).toBeVisible();
    await expect(catalog.resultCount()).toContainText(/\d+ results?/);
    await expect(catalog.paginationInfo()).toContainText('Page 1');
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
  }, async ({ page, catalog }) => {
    await catalog.goto();
    await catalog.search('Thingamajig');

    await page.waitForURL(/q=Thingamajig/, { timeout: 2000 });
    await expect(catalog.productCard('prod_thingamajig')).toBeVisible();
    await expect(catalog.productCard('prod_gizmo')).toHaveCount(0);

    await page.reload();
    await expect(catalog.searchInput()).toHaveValue('Thingamajig');
    await expect(catalog.productCard('prod_thingamajig')).toBeVisible();
  });

  test('category filter narrows results and writes ?category=', {
    tag: ['@regression', '@catalog'],
  }, async ({ page, catalog }) => {
    await catalog.goto();
    await catalog.search('Basic Tee');
    await page.waitForURL(/q=/);
    await catalog.toggleCategory('apparel');
    await page.waitForURL(/category=apparel/);

    await expect(catalog.productCard('prod_tee_basic')).toBeVisible();
    await expect(catalog.productCard('prod_widget')).toHaveCount(0);
  });

  test('sort=price_asc shows cheapest first in a filtered set', {
    tag: ['@regression', '@catalog'],
  }, async ({ page, db, catalog }) => {
    // Own two products with a deterministic, unique-to-this-test name so the
    // assertion can't be undercut by factory products from parallel specs.
    const tag = `zztest_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const cheap = await db.product.create({
      data: {
        id: `prod_${tag}_cheap`,
        name: `${tag} cheap`,
        description: 'cheap',
        priceCents: 100,
        stock: 5,
        category: 'gadgets',
        tags: [],
      },
    });
    await db.product.create({
      data: {
        id: `prod_${tag}_pricey`,
        name: `${tag} pricey`,
        description: 'pricey',
        priceCents: 9_999,
        stock: 5,
        category: 'gadgets',
        tags: [],
      },
    });

    await catalog.goto();
    await catalog.search(tag);
    await page.waitForURL(new RegExp(`q=${tag}`));
    await catalog.setSort('price_asc');
    await page.waitForURL(/sort=price_asc/);

    const firstCard = catalog.productCards().first();
    await expect(firstCard).toHaveAttribute(
      'data-testid',
      `product-card-${cheap.id}`,
    );
  });

  test('empty state appears when no products match', {
    tag: ['@regression', '@catalog'],
  }, async ({ page, catalog }) => {
    await catalog.goto();
    await catalog.search('definitelydoesnotexist');
    await page.waitForURL(/q=definitelydoesnotexist/);

    await expect(catalog.emptyState()).toBeVisible();
    await expect(catalog.productCards()).toHaveCount(0);

    await page.getByTestId('catalog-empty-clear').click();
    await expect(catalog.emptyState()).toHaveCount(0);
    await expect(catalog.searchInput()).toHaveValue('');
  });

  test('pagination advances pages and result count is stable', {
    tag: ['@regression', '@catalog'],
  }, async ({ page, catalog }) => {
    await catalog.goto();

    await expect(catalog.paginationInfo()).toContainText('Page 1');
    await catalog.paginationNext().click();
    await page.waitForURL(/page=2/);
    await expect(catalog.paginationInfo()).toContainText('Page 2');
    await catalog.paginationPrev().click();
    await page.waitForURL((url) => !url.searchParams.has('page'));
    await expect(catalog.paginationInfo()).toContainText('Page 1');
  });
});
