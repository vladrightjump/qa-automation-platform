// Composable Playwright fixtures. The four building blocks:
//   - `db`         worker-scoped Prisma client (the SAME singleton the API uses)
//   - `api`        test-scoped, Zod-validating HTTP wrapper
//   - `testUser`   per-test fresh user (unique email via faker, created via API)
//   - `authedPage` browser page with the testUser's token pre-injected into
//                  `localStorage`, so specs skip the login UI walk.
//
// Specs `import { test, expect } from '../fixtures'` and request only the
// fixtures they need; unused ones are never built.
import { test as base, expect } from '@playwright/test';
import { prisma, type PrismaClient } from '@qa/db';
import { ApiClient } from '../support/api-client';
import { TOKEN_KEY, USER_KEY } from '../support/keys';
import { UserFactory } from '../factories/user.factory';

interface AuthedTestUser {
  id: string;
  email: string;
  password: string;
  token: string;
}

interface Fixtures {
  api: ApiClient;
  testUser: AuthedTestUser;
  authedPage: import('@playwright/test').Page;
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
    await use({ id: user.id, email: user.email, password: creds.password, token });
  },

  authedPage: async ({ page, testUser }, use) => {
    // `addInitScript` runs before any of the page's own scripts — including
    // the React hydration that reads localStorage in the AuthProvider, so
    // the storefront sees the user as already signed in.
    await page.addInitScript(
      (args: {
        tokenKey: string;
        userKey: string;
        token: string;
        user: { id: string; email: string };
      }) => {
        window.localStorage.setItem(args.tokenKey, args.token);
        window.localStorage.setItem(args.userKey, JSON.stringify(args.user));
      },
      {
        tokenKey: TOKEN_KEY,
        userKey: USER_KEY,
        token: testUser.token,
        user: { id: testUser.id, email: testUser.email },
      },
    );
    await use(page);
  },
});

export { expect };
