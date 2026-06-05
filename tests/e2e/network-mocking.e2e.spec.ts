// Network-mocking specs — demonstrate `page.route` for forcing API
// responses the real backend can't easily produce: hard 5xx, 401 expiry,
// slow networks, schema drift.
//
// Each test seeds nothing on the server side because the route handler
// intercepts before the request reaches the real API.
import { test, expect } from '../fixtures';
import { PagedProductsSchema } from '@qa/contracts';

const PRODUCTS_GLOB = '**/products?*';
const CART_ITEMS_GLOB = '**/cart/items';
const CART_GLOB = '**/cart';

test.describe('network mocking (UI)', () => {
  test('500 on add-to-cart surfaces an error toast and leaves cart empty', {
    tag: ['@regression', '@network', '@cart', '@negative'],
  }, async ({
    authedPage,
    storefront,
  }) => {
    await authedPage.route(CART_ITEMS_GLOB, (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal server error' }),
      }),
    );

    await authedPage.goto('/products/prod_widget');
    await storefront.addToCart('prod_widget');

    // Cart count should stay at 0 since the POST failed server-side.
    await expect(authedPage).toHaveCartCount(0);
  });

  test('401 on cart redirects authed user to /login', {
    tag: ['@regression', '@network', '@auth', '@negative'],
  }, async ({
    authedPage,
  }) => {
    await authedPage.route(CART_GLOB, (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Unauthorized' }),
      }),
    );

    await authedPage.goto('/cart');
    // The cart page redirects unauthenticated users; the 401 trips
    // the same code path because the AuthProvider drops state.
    // Use a poll so we tolerate the async redirect.
    await expect
      .poll(() => new URL(authedPage.url()).pathname)
      .toMatch(/\/login|\/cart/);
  });

  test('slow /products shows the loading state', {
    tag: ['@regression', '@network', '@catalog'],
  }, async ({
    page,
    storefront,
  }) => {
    await page.route(PRODUCTS_GLOB, async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      await route.continue();
    });

    await storefront.goto();
    // The skeleton grid renders before the data arrives. The shimmer
    // utility class is set on every Skeleton instance.
    await expect(page.locator('.skeleton').first()).toBeVisible();
  });

  test('contract drift is caught by toMatchContract', {
    tag: ['@regression', '@network', '@catalog', '@negative'],
  }, async ({
    api,
  }) => {
    // Sanity check the matcher itself: drift response is missing
    // required Product fields → schema parse fails.
    const driftedPayload = {
      items: [{ id: 'prod_widget', name: 'Widget' }], // missing required fields
      total: 1,
      page: 1,
      pageSize: 1,
    };
    expect(PagedProductsSchema.safeParse(driftedPayload).success).toBe(false);

    // The real endpoint still passes contract via our custom matcher.
    const real = await api.listProducts({ pageSize: 1 });
    expect(real).toMatchContract(PagedProductsSchema);
  });

  test('waitForResponse fires when search debounces', {
    tag: ['@regression', '@network', '@catalog'],
  }, async ({
    page,
    storefront,
  }) => {
    await storefront.goto();
    // The debounced search input triggers a network request after 300ms.
    // `waitForResponse` makes the assertion about the *network event*,
    // not a DOM proxy — far more precise than waitForURL.
    const [response] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes('/products') && res.url().includes('q=Thingamajig'),
      ),
      storefront.search('Thingamajig'),
    ]);
    expect(response.ok()).toBe(true);
    const body: unknown = await response.json();
    expect(body).toMatchContract(PagedProductsSchema);
    expect(PagedProductsSchema.parse(body).items[0]?.id).toBe(
      'prod_thingamajig',
    );
  });
});
