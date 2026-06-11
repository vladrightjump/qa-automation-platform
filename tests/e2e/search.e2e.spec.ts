// Search UX — navbar SearchBox + /search results route. Drives the new
// /products/search + /products/suggestions endpoints from the browser.
import { test, expect } from '../fixtures';

// Navbar SearchBox is `hidden md:block` (visible only at viewport ≥ 768px).
// Phone projects (Pixel 5, iPhone 14) and the Galaxy Tab S4 in portrait are
// all narrower than 768, so the search UI is unreachable there. Adding a
// mobile search affordance is tracked as a follow-up; for now the tests in
// this describe block skip on sub-md viewports.
const MD_BREAKPOINT_PX = 768;

test.describe('product search (UI)', () => {
  test('typing in the search box reveals suggestions and Enter navigates to a result', {
    tag: ['@smoke', '@search', '@sanity'],
  }, async ({ page, storefront, search }) => {
    test.skip(
      (page.viewportSize()?.width ?? Infinity) < MD_BREAKPOINT_PX,
      'Navbar SearchBox is hidden below the md (768px) breakpoint; a mobile search affordance is a follow-up.',
    );
    await storefront.goto();

    await search.type('Widge');
    // The dropdown lists the seeded prod_widget as a suggestion.
    await expect(search.suggestions()).toBeVisible();
    await expect(search.suggestion('prod_widget')).toBeVisible();
    await expect(search.suggestion('prod_widget')).toContainText('Widget');

    // Arrow-down + Enter selects the highlighted suggestion → product detail.
    await search.submit();
    await expect(page).toHaveURL(/\/products\/prod_widget$/);
  });

  test('clicking a suggestion navigates to the product', {
    tag: ['@regression', '@search'],
  }, async ({ page, storefront, search }) => {
    await storefront.goto();
    await search.type('Gizmo');
    await expect(search.suggestion('prod_gizmo')).toBeVisible();
    await search.pickSuggestion('prod_gizmo');
    await expect(page).toHaveURL(/\/products\/prod_gizmo$/);
  });

  test('submitting a query with no exact match lands on /search and shows results', {
    tag: ['@regression', '@search', '@edge'],
  }, async ({ page, api, storefront, search }) => {
    // Use a token that ranks the seeded `Doohickey` highly without producing
    // an exact-name suggestion that would deep-link to a product page.
    const q = 'compact';
    await storefront.goto();
    await search.type(q);
    await search.submit();

    await expect(page).toHaveURL(new RegExp(`/search\\?q=${q}`));

    // Result count matches the API response.
    const apiRes = await api.searchProducts(q);
    await expect(search.resultCount()).toContainText(String(apiRes.total));
  });

  test('empty result set renders the empty state', {
    tag: ['@regression', '@search', '@empty'],
  }, async ({ page, search }) => {
    await search.gotoResults('xzqwyzz123nomatch');
    await expect(page.getByText(/No results for/)).toBeVisible();
  });
});
