// Composable Playwright fixtures.
//
// Building blocks:
//   - `db`           worker-scoped Prisma client (the SAME singleton the API uses)
//   - `api`          test-scoped, Zod-validating HTTP wrapper
//   - `testUser`     per-test fresh user (unique email via faker, created via API)
//   - `adminUser`    logs in as the deterministic seeded admin
//   - `authedPage`   browser page with the testUser's token pre-injected into
//                    `localStorage`, so specs skip the login UI walk
//   - `adminPage`    same, for the admin user
//
// Page Objects:
//   - `storefront`, `cart`, `checkout`, `addresses`, `adminProducts`
//     each takes `page` and surfaces intent-revealing helpers.
//
// Auth is orthogonal to POs: a spec opts into auth by *also* destructuring
// `authedPage` / `adminPage` (they mutate the shared `page` with an init
// script before navigation). Public-flow specs simply destructure the PO.
//
// Specs `import { test, expect } from '../fixtures'` and request only the
// fixtures they need; unused ones are never built.
import { test as base, expect } from '@playwright/test';
import { prisma, ADMIN_EMAIL, ADMIN_PASSWORD, type PrismaClient } from '@qa/db';
import type { UserRole } from '@qa/contracts';
import { ApiClient } from '../support/api-client';
import { TOKEN_KEY, USER_KEY } from '../support/keys';
import { UserFactory } from '../factories/user.factory';
import { StorefrontPage } from '../pages/storefront.page';
import { CartPage } from '../pages/cart.page';
import { CheckoutPage } from '../pages/checkout.page';
import { AddressesPage } from '../pages/addresses.page';
import { AdminProductsPage } from '../pages/admin.page';

interface AuthedTestUser {
  id: string;
  email: string;
  password: string;
  role: UserRole;
  token: string;
}

interface Fixtures {
  api: ApiClient;
  testUser: AuthedTestUser;
  adminUser: AuthedTestUser;
  authedPage: import('@playwright/test').Page;
  adminPage: import('@playwright/test').Page;
  storefront: StorefrontPage;
  cart: CartPage;
  checkout: CheckoutPage;
  addresses: AddressesPage;
  adminProducts: AdminProductsPage;
}

interface WorkerFixtures {
  db: PrismaClient;
}

export const test = base.extend<Fixtures, WorkerFixtures>({
  // Worker-scoped: a single Prisma client is reused across all tests on a
  // worker. Closing it would race with concurrent tests, so we let process
  // exit clean it up.
  db: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      await use(prisma);
    },
    { scope: 'worker' },
  ],

  api: async ({ request }, use) => {
    await use(new ApiClient(request));
  },

  testUser: async ({ api }, use) => {
    const creds = UserFactory.build();
    const { token, user } = await api.register(creds.email, creds.password);
    await use({
      id: user.id,
      email: user.email,
      password: creds.password,
      role: user.role,
      token,
    });
  },

  adminUser: async ({ api }, use) => {
    // The deterministic admin is seeded (and re-seeded by /test/reset).
    const { token, user } = await api.login(ADMIN_EMAIL, ADMIN_PASSWORD);
    await use({
      id: user.id,
      email: user.email,
      password: ADMIN_PASSWORD,
      role: user.role,
      token,
    });
  },

  authedPage: async ({ page, testUser }, use) => {
    await injectAuth(page, testUser);
    await use(page);
  },

  adminPage: async ({ page, adminUser }, use) => {
    await injectAuth(page, adminUser);
    await use(page);
  },

  // Page Object fixtures. Each depends on `page` only — auth is opted into
  // by also requesting `authedPage` / `adminPage`, which mutate the shared
  // page before navigation.
  storefront: async ({ page }, use) => {
    await use(new StorefrontPage(page));
  },
  cart: async ({ page }, use) => {
    await use(new CartPage(page));
  },
  checkout: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },
  addresses: async ({ page }, use) => {
    await use(new AddressesPage(page));
  },
  adminProducts: async ({ page }, use) => {
    await use(new AdminProductsPage(page));
  },
});

async function injectAuth(
  page: import('@playwright/test').Page,
  user: AuthedTestUser,
): Promise<void> {
  await page.addInitScript(
    (args: {
      tokenKey: string;
      userKey: string;
      token: string;
      user: { id: string; email: string; role: UserRole };
    }) => {
      window.localStorage.setItem(args.tokenKey, args.token);
      window.localStorage.setItem(args.userKey, JSON.stringify(args.user));
    },
    {
      tokenKey: TOKEN_KEY,
      userKey: USER_KEY,
      token: user.token,
      user: { id: user.id, email: user.email, role: user.role },
    },
  );
}

export { expect };
