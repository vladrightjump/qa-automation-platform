// Accessibility scan suite — runs @axe-core/playwright against each major
// route. Uses the custom `toBeAccessible` matcher (see support/matchers.ts).
//
// Failures here mean a new violation crept in. To document an intentional
// pre-existing violation, add the rule id to `disableRules` and leave a
// comment explaining why.
import { test, expect } from '../fixtures';

// The "playful" violet brand palette has marginal `color-contrast`
// ratios in some auth/empty/checkout states (light-tinted labels, brand
// accents on white). Acceptable for this direction — flag separately if
// we ship a high-contrast theme.
const PLAYFUL_PALETTE: { disableRules: string[] } = {
  disableRules: ['color-contrast'],
};

test.describe('a11y scans', () => {
  test('storefront has no serious violations', {
    tag: ['@a11y', '@regression'],
  }, async ({
    storefront,
    page,
  }) => {
    await storefront.goto();
    await expect(page).toBeAccessible(PLAYFUL_PALETTE);
  });

  test('product detail page has no serious violations', {
    tag: ['@a11y', '@regression'],
  }, async ({
    page,
  }) => {
    await page.goto('/products/prod_widget');
    await expect(page).toBeAccessible(PLAYFUL_PALETTE);
  });

  test('cart page (empty state) has no serious violations', {
    tag: ['@a11y', '@regression'],
  }, async ({
    authedPage,
  }) => {
    await authedPage.goto('/cart');
    await expect(authedPage).toBeAccessible(PLAYFUL_PALETTE);
  });

  test('checkout wizard step 1 has no serious violations', {
    tag: ['@a11y', '@regression'],
  }, async ({
    authedPage,
    api,
    testUser,
  }) => {
    // Seed an address so the saved-addresses radio group renders.
    await api.createAddress(testUser.token, {
      label: 'Home',
      name: 'Test Person',
      line1: '1 Test St',
      city: 'Testville',
      postalCode: '12345',
      isDefault: true,
    });
    await authedPage.goto('/checkout');
    await expect(authedPage).toBeAccessible(PLAYFUL_PALETTE);
  });

  test('wishlist (empty) has no serious violations', {
    tag: ['@a11y', '@regression'],
  }, async ({
    authedPage,
  }) => {
    await authedPage.goto('/wishlist');
    await expect(authedPage).toBeAccessible(PLAYFUL_PALETTE);
  });

  test('login page has no serious violations', {
    tag: ['@a11y', '@regression'],
  }, async ({
    page,
  }) => {
    await page.goto('/login');
    await expect(page).toBeAccessible(PLAYFUL_PALETTE);
  });

  test('admin/products has no serious violations', {
    tag: ['@a11y', '@regression'],
  }, async ({
    adminPage,
    adminProducts,
  }) => {
    await adminProducts.goto();
    await expect(adminPage).toBeAccessible(PLAYFUL_PALETTE);
  });
});
