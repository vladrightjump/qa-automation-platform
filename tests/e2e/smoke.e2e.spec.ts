// Trivial smoke spec that exercises all three Phase-4 fixtures together:
//   - `db`         reads the seeded products straight from Postgres
//   - `api`        validates the same products via the API + Zod contract
//   - `authedPage` opens the storefront with the testUser pre-signed-in
//
// Existence of this passing test is the Phase 4 Definition of Done.
import { test, expect } from '../fixtures';

test('@smoke storefront loads with seeded products and an authed user', async ({
  authedPage,
  api,
  db,
}) => {
  // 1) DB ground truth: the deterministic seed shipped 4 products.
  const dbProducts = await db.product.findMany({ orderBy: { id: 'asc' } });
  expect(dbProducts.length).toBeGreaterThanOrEqual(4);
  const dbIds = dbProducts.map((p) => p.id);
  expect(dbIds).toEqual(
    expect.arrayContaining(['prod_widget', 'prod_gizmo', 'prod_thingamajig', 'prod_oos']),
  );

  // 2) API surface conforms to the shared Zod schema (parsed in the
  //    api-client). Use the single-product endpoint so the assertion is
  //    independent of how many factory products other concurrent specs
  //    have left in the DB.
  const widget = await api.getProduct('prod_widget');
  expect(widget.id).toBe('prod_widget');

  // 3) Browser session is authenticated (token injected before page load) and
  //    the testid map is wired up — the navbar shows the cart count badge.
  await authedPage.goto('/');
  await expect(authedPage.getByTestId('nav-products')).toBeVisible();
  await expect(authedPage.getByTestId('nav-cart')).toBeVisible();
  await expect(authedPage.getByTestId('cart-count')).toBeVisible();
  // Signed-in users see the Orders link too.
  await expect(authedPage.getByTestId('nav-orders')).toBeVisible();
  // Seeded product is reachable via the detail route. The home grid is
  // now paginated so prod_widget isn't necessarily on page 1.
  await authedPage.goto('/products/prod_widget');
  await expect(authedPage.getByTestId('product-card-prod_widget')).toBeVisible();
});
