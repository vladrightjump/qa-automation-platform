import { test, expect } from '../fixtures';

test.describe('quick-view modal (UI)', () => {
  test('quick view opens, adds to cart, then closes', {
    tag: ['@smoke', '@catalog'],
  }, async ({
    authedPage,
    storefront,
  }) => {
    await storefront.goto();
    // Pick the first product card on page 1 — its specific id is irrelevant;
    // the test is about the modal flow.
    const firstCard = storefront.productCards().first();
    await expect(firstCard).toBeVisible();
    await firstCard.scrollIntoViewIfNeeded();
    const productTestId = await firstCard.getAttribute('data-testid');
    const productId = productTestId!.replace(/^product-card-/, '');

    // The quick-view button is hover-revealed (opacity:0 → opacity:1).
    // Force-click bypasses the actionability visibility check.
    await authedPage
      .getByTestId(`quick-view-${productId}`)
      .click({ force: true });

    const modal = authedPage.getByTestId('quick-view-modal');
    await expect(modal).toBeVisible();

    await authedPage.getByTestId('quick-view-add').click();
    // Modal closes on successful add.
    await expect(modal).toHaveCount(0);
    await expect(authedPage).toHaveCartCount(1);
  });

  test('quick view ESC dismisses without adding to cart', {
    tag: ['@regression', '@catalog'],
  }, async ({
    authedPage,
    storefront,
  }) => {
    await storefront.goto();
    const firstCard = storefront.productCards().first();
    await expect(firstCard).toBeVisible();
    await firstCard.scrollIntoViewIfNeeded();
    const productTestId = await firstCard.getAttribute('data-testid');
    const productId = productTestId!.replace(/^product-card-/, '');

    await authedPage
      .getByTestId(`quick-view-${productId}`)
      .click({ force: true });
    await expect(authedPage.getByTestId('quick-view-modal')).toBeVisible();
    await authedPage.keyboard.press('Escape');
    await expect(authedPage.getByTestId('quick-view-modal')).toHaveCount(0);
    await expect(authedPage).toHaveCartCount(0);
  });
});
