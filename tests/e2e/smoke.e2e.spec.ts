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

  // 2) API surface matches the DB and conforms to the shared Zod schema.
  const apiProducts = await api.listProducts();
  expect(apiProducts.map((p) => p.id)).toEqual(expect.arrayContaining(dbIds));

  // 3) Browser session is authenticated (token injected before page load) and
  //    the testid map is wired up — the navbar shows the cart count badge.
  await authedPage.goto('/');
  await expect(authedPage.getByTestId('nav-products')).toBeVisible();
  await expect(authedPage.getByTestId('nav-cart')).toBeVisible();
  await expect(authedPage.getByTestId('cart-count')).toBeVisible();
  // Signed-in users see the Orders link too.
  await expect(authedPage.getByTestId('nav-orders')).toBeVisible();
  // Seeded product card is rendered after client hydration + fetch.
  await expect(authedPage.getByTestId('product-card-prod_widget')).toBeVisible();
});
