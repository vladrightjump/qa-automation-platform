// Geolocation (UI): the GeoBanner uses navigator.geolocation + GET /geo/resolve
// to suggest a locale/currency. Playwright emulates `geolocation`, `permissions`,
// `locale`, and `timezoneId` natively — no real device needed.
//
// The "denied" path is exercised by simply not granting the geolocation
// permission; navigator.geolocation calls its error callback synchronously
// and the banner falls back to a manual region picker.
import { test, expect } from '../fixtures';
import { ProductFactory } from '../factories/product.factory';

const BERLIN_COORDS = { latitude: 52.52, longitude: 13.405 };

test.describe('geolocation banner — granted', () => {
  test.use({
    geolocation: BERLIN_COORDS,
    permissions: ['geolocation'],
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
  });

  test('Berlin coords + permission grant → banner suggests DE/EUR, accept localizes prices', {
    tag: ['@sanity', '@geo'],
  }, async ({ page, db, storefront }) => {
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 5, priceCents: 5_000 }),
    });

    await storefront.goto();

    // The banner suggests Germany/EUR.
    await expect(storefront.geoBanner()).toBeVisible();
    await expect(storefront.geoSuggestion()).toContainText('Germany');
    await expect(storefront.geoSuggestion()).toContainText('EUR');

    // Accepting flips the locale.
    await storefront.acceptGeo();
    await expect(storefront.geoBanner()).toHaveCount(0);
    await expect(storefront.localeSwitcher()).toHaveValue('de-DE');

    // Navigate to the factory product's detail page to assert its localized
    // price (the storefront list is paginated; deep-link to be deterministic).
    await page.goto(`/products/${product.id}`);
    await expect(storefront.productPrice(product.id)).toContainText('€');
    // formatMoney(5000, 'de-DE') → "46,00 €" — deterministic via FX_RATES_FROM_USD.
    await expect(storefront.productPrice(product.id)).toContainText('46,00');

    // Locked invariant: the DB row is still canonical USD cents.
    const dbProduct = await db.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(dbProduct.priceCents).toBe(5_000);
  });

  test('dismiss hides the banner without changing the locale', {
    tag: ['@regression', '@geo'],
  }, async ({ storefront }) => {
    await storefront.goto();
    await expect(storefront.geoBanner()).toBeVisible();

    await storefront.dismissGeo();
    await expect(storefront.geoBanner()).toHaveCount(0);
    // Default locale stays en-US.
    await expect(storefront.localeSwitcher()).toHaveValue('en-US');
  });
});

test.describe('geolocation banner — denied / unavailable', () => {
  // No `permissions` grant → navigator.geolocation calls the error callback.
  test.use({
    geolocation: BERLIN_COORDS,
    locale: 'en-US',
  });

  test('permission denied → suggestion banner is hidden, manual region picker is shown', {
    tag: ['@regression', '@geo'],
  }, async ({ page, storefront }) => {
    await storefront.goto();

    // No suggestion banner (denial path).
    await expect(storefront.geoBanner()).toHaveCount(0);

    // The fallback picker lists every seeded region.
    await expect(storefront.geoFallback()).toBeVisible();
    await expect(storefront.geoRegionSelect()).toBeVisible();
    await expect(page.getByTestId('geo-region-option-US')).toBeAttached();
    await expect(page.getByTestId('geo-region-option-DE')).toBeAttached();
    await expect(page.getByTestId('geo-region-option-FR')).toBeAttached();

    // Picking DE manually flips to de-DE.
    await storefront.geoRegionSelect().selectOption('DE');
    await expect(storefront.localeSwitcher()).toHaveValue('de-DE');
    await expect(page.getByTestId('nav-cart-label')).toHaveText('Warenkorb');
  });
});
