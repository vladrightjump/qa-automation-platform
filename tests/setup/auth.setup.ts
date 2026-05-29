// Playwright setup project — runs ONCE per project run, signs in via the API,
// and writes a storageState file each downstream project consumes.
//
// This complements (rather than replaces) the per-test `testUser` fixture:
//   - storageState is great for read-only / shared-user smoke flows
//   - per-test fixtures stay the default for specs that mutate user state
//     (cart, orders, wishlist) so parallel runs don't trample each other.
import { test as setup, expect } from '@playwright/test';
import { request as playwrightRequest } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from '@qa/db';
import { TOKEN_KEY, USER_KEY } from '../support/keys';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.resolve(__dirname, '..', '.auth');

const USER_FILE = path.join(AUTH_DIR, 'user.json');
const ADMIN_FILE = path.join(AUTH_DIR, 'admin.json');

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:3001';
const WEB_BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

// Deterministic demo user — idempotent register/login so re-runs are fine.
const DEMO_EMAIL = 'demo@qa-test.local';
const DEMO_PASSWORD = 'DemoPass123!';

async function getOrCreateToken(
  email: string,
  password: string,
): Promise<{ token: string; user: { id: string; email: string; role: 'USER' | 'ADMIN' } }> {
  const api = await playwrightRequest.newContext();
  try {
    // Try login first; register if the account doesn't exist.
    let res = await api.post(`${API_BASE}/auth/login`, {
      data: { email, password },
    });
    if (res.status() === 401) {
      res = await api.post(`${API_BASE}/auth/register`, {
        data: { email, password },
      });
    }
    if (!res.ok()) {
      throw new Error(
        `auth.setup: could not obtain token for ${email}: ${res.status()} ${await res.text()}`,
      );
    }
    return res.json();
  } finally {
    await api.dispose();
  }
}

setup('authenticate shared demo user', async ({ page }) => {
  const { token, user } = await getOrCreateToken(DEMO_EMAIL, DEMO_PASSWORD);

  // Origin must match the storefront so storageState's localStorage applies.
  await page.goto(WEB_BASE);
  await page.evaluate(
    ({ tokenKey, userKey, t, u }) => {
      window.localStorage.setItem(tokenKey, t);
      window.localStorage.setItem(userKey, JSON.stringify(u));
    },
    { tokenKey: TOKEN_KEY, userKey: USER_KEY, t: token, u: user },
  );

  await page.context().storageState({ path: USER_FILE });
  expect(token.length).toBeGreaterThan(10);
});

setup('authenticate seeded admin', async ({ page }) => {
  const { token, user } = await getOrCreateToken(ADMIN_EMAIL, ADMIN_PASSWORD);
  if (user.role !== 'ADMIN') {
    throw new Error(
      `auth.setup: expected admin role, got ${user.role}. Did the seed run?`,
    );
  }

  await page.goto(WEB_BASE);
  await page.evaluate(
    ({ tokenKey, userKey, t, u }) => {
      window.localStorage.setItem(tokenKey, t);
      window.localStorage.setItem(userKey, JSON.stringify(u));
    },
    { tokenKey: TOKEN_KEY, userKey: USER_KEY, t: token, u: user },
  );

  await page.context().storageState({ path: ADMIN_FILE });
  expect(token.length).toBeGreaterThan(10);
});
