// i18n (UI): the locale switcher in the navbar drives translated strings
// and formatMoney output. The locked invariant from phase 14: money lives in
// canonical USD `*Cents` in the DB; locale is a display concern only.
//
// At least one test here asserts the localized currency string on screen AND
// reads the same row's USD cents from the DB to enforce that invariant.
import { test, expect } from '../fixtures';
import { ProductFactory } from '../factories/product.factory';
import { AddressFactory } from '../factories/address.factory';
import { convertCents } from '@qa/contracts';

const DE_PRICE_USD_CENTS = 5_000; // $50 USD → €46,00 with FX_RATES_FROM_USD.EUR

test.describe('i18n — locale switcher (UI)', () => {
  test('switching to de-DE translates navbar strings and re-formats prices', {
    tag: ['@regression', '@i18n'],
  }, async ({ page, db, storefront }) => {
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 5, priceCents: DE_PRICE_USD_CENTS }),
    });

    // Deep-link to the product detail page so the assertion targets a known,
    // deterministic price element (the catalog grid is paginated).
    await page.goto(`/products/${product.id}`);

    // Default locale: en-US. Cart label reads "Bag", price shows in USD.
    await expect(page.getByTestId('nav-cart-label')).toHaveText('Bag');
    await expect(storefront.productPrice(product.id)).toContainText('$');

    await storefront.selectLocale('de-DE');

    // Translated nav label.
    await expect(page.getByTestId('nav-cart-label')).toHaveText('Warenkorb');

    // German currency formatting: euro symbol + decimal comma + grouping period.
    // formatMoney(5000, 'de-DE') → "46,00 €" (5000 * 0.92 = 4600 → 46,00 EUR).
    await expect(storefront.productPrice(product.id)).toContainText('€');
    await expect(storefront.productPrice(product.id)).toContainText('46,00');
  });

  test('switching to fr-FR uses French currency formatting (€)', {
    tag: ['@regression', '@i18n'],
  }, async ({ page, db, storefront }) => {
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 5, priceCents: 5_000 }),
    });

    await page.goto(`/products/${product.id}`);
    await storefront.selectLocale('fr-FR');

    await expect(page.getByTestId('nav-cart-label')).toHaveText('Panier');
    // French EUR formatting: "46,00 €" (same number, locale-specific symbol order).
    await expect(storefront.productPrice(product.id)).toContainText('€');
    await expect(storefront.productPrice(product.id)).toContainText('46,00');
  });

  test('locale persists across reloads via cookie + localStorage', {
    tag: ['@regression', '@i18n'],
  }, async ({ page, storefront }) => {
    await storefront.goto();
    await storefront.selectLocale('de-DE');
    await expect(page.getByTestId('nav-cart-label')).toHaveText('Warenkorb');

    await page.reload();

    await expect(page.getByTestId('nav-cart-label')).toHaveText('Warenkorb');
    await expect(storefront.localeSwitcher()).toHaveValue('de-DE');
  });

  test('signed-in locale switch persists to User.preferredLocale (DB)', {
    tag: ['@regression', '@i18n'],
  }, async ({ authedPage, db, testUser, storefront }) => {
    await storefront.goto();
    // The PATCH fires via the LocaleProvider — wait for it to round-trip so
    // the DB assertion isn't racy.
    await Promise.all([
      authedPage.waitForResponse(
        (r) => r.url().endsWith('/me/locale') && r.request().method() === 'PATCH',
      ),
      storefront.selectLocale('fr-FR'),
    ]);

    await expect
      .poll(
        () => db.user.findUnique({ where: { id: testUser.id } }).then((u) => u?.preferredLocale),
        { timeout: 5_000 },
      )
      .toBe('fr-FR');
  });
});

test.describe('i18n — locked invariant (display vs ground truth)', () => {
  test('checkout in de-DE shows EUR on screen but Order.totalCents stays USD in the DB', {
    tag: ['@sanity', '@i18n'],
  }, async ({ authedPage, api, db, testUser, storefront, cart, checkout }) => {
    // Set up a 1-item, $50.00 USD cart with a default address so the wizard
    // sails through to the review step.
    await api.createAddress(
      testUser.token,
      AddressFactory.build({ isDefault: true }),
    );
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 5, priceCents: DE_PRICE_USD_CENTS }),
    });
    await api.addToCart(testUser.token, product.id, 1);

    // Switch locale BEFORE the checkout summary renders so the localized
    // amounts make it into the screenshot of the review.
    await storefront.goto();
    await storefront.selectLocale('de-DE');

    await cart.goto();
    // Cart subtotal renders in EUR.
    await expect(authedPage.getByTestId('cart-subtotal')).toContainText('€');
    await expect(authedPage.getByTestId('cart-subtotal')).toContainText('46,00');

    await checkout.goto();
    await checkout.waitForAddressReady();
    await checkout.next(); // address → payment
    await checkout.next(); // payment → review

    // The localized total on screen: EUR.
    const expectedEurCents = convertCents(DE_PRICE_USD_CENTS, 'EUR'); // 4600
    expect(expectedEurCents).toBe(4_600);
    await expect(checkout.summaryTotal()).toContainText('€');
    await expect(checkout.summaryTotal()).toContainText('46,00');

    await checkout.placeOrder();
    await expect(authedPage).toHaveURL(/\/orders\/.+/);

    // Ground truth: the Order row written to the DB is canonical USD cents.
    // The display localized; the database did NOT move.
    const order = await db.order.findFirstOrThrow({
      where: { userId: testUser.id },
      orderBy: { createdAt: 'desc' },
    });
    expect(order.totalCents).toBe(DE_PRICE_USD_CENTS);
  });
});
