// Data-driven UI matrix: every supported locale × every payment method,
// each row driving a full PAID checkout. Demonstrates table-driven E2E
// coverage of three intersecting features (i18n, geo-derived currency,
// payment choice) without rewriting the POMs they each already exercise
// in isolation.
//
// The region dimension from the original spec doc is captured implicitly:
// each locale's natural region (en-US → USD, de-DE / fr-FR → EUR) drives
// the currency assertion, so a regression in either the FX-rate map or
// the locale-to-region join surfaces here.
import { test, expect } from '../fixtures';
import { ProductFactory } from '../factories/product.factory';
import { AddressFactory } from '../factories/address.factory';
import type { Locale, PaymentMethod } from '@qa/contracts';

interface Combo {
  locale: Locale;
  payment: PaymentMethod;
  navLabel: string;
  currencySymbol: string;
  sanity?: boolean;
}

const COMBOS: Combo[] = [
  { locale: 'en-US', payment: 'CARD', navLabel: 'Bag', currencySymbol: '$', sanity: true },
  { locale: 'en-US', payment: 'PAYPAL', navLabel: 'Bag', currencySymbol: '$' },
  { locale: 'en-US', payment: 'COD', navLabel: 'Bag', currencySymbol: '$' },
  { locale: 'de-DE', payment: 'CARD', navLabel: 'Warenkorb', currencySymbol: '€' },
  { locale: 'de-DE', payment: 'PAYPAL', navLabel: 'Warenkorb', currencySymbol: '€' },
  { locale: 'de-DE', payment: 'COD', navLabel: 'Warenkorb', currencySymbol: '€' },
  { locale: 'fr-FR', payment: 'CARD', navLabel: 'Panier', currencySymbol: '€' },
  { locale: 'fr-FR', payment: 'PAYPAL', navLabel: 'Panier', currencySymbol: '€' },
  { locale: 'fr-FR', payment: 'COD', navLabel: 'Panier', currencySymbol: '€' },
];

test.describe('cross-feature matrix (locale × payment)', () => {
  for (const combo of COMBOS) {
    const tags: string[] = [
      '@regression',
      '@i18n',
      '@geo',
      '@checkout',
    ];
    if (combo.sanity) tags.push('@sanity');

    test(
      `${combo.locale} + ${combo.payment} → PAID with localized chrome`,
      { tag: tags },
      async ({
        authedPage,
        api,
        db,
        testUser,
        storefront,
        cart,
        checkout,
      }) => {
        const product = await db.product.create({
          data: ProductFactory.build({ stock: 3, priceCents: 2_500 }),
        });
        await api.createAddress(
          testUser.token,
          AddressFactory.build({ isDefault: true }),
        );
        await api.addToCart(testUser.token, product.id, 1);

        await storefront.goto();
        await storefront.selectLocale(combo.locale);
        await expect(authedPage.getByTestId('nav-cart-label')).toHaveText(
          combo.navLabel,
        );

        await cart.goto();
        await expect(cart.subtotal()).toContainText(combo.currencySymbol);

        await cart.proceedToCheckout();
        await checkout.waitForAddressReady();
        await checkout.next();
        await checkout.pickPayment(combo.payment);
        await checkout.next();
        await checkout.placeOrder();

        await expect(authedPage).toHaveURL(/\/orders\/.+/);
        await expect(checkout.orderStatus()).toHaveText('PAID');
      },
    );
  }
});
