# Tests

Six e2e specs, six API specs, six page objects, six API clients.
The layout below explains how they fit together; `TESTING.md` covers
how to run them.

## Layout

```
tests/
  e2e/           smoke catalog cart checkout orders admin
  api/           auth products cart checkout orders admin-products
  api-clients/   base + auth, products, cart, checkout, orders, admin (+ index)
  pages/         auth catalog cart checkout orders admin
  factories/     user, product, address, admin-product
  fixtures/      composable Playwright fixtures (the spec entry point)
  setup/         auth.setup.ts produces shared storageState files
  support/       matchers, jwt-helpers, keys, seed helpers
```

## Fixtures

Spec entry point. `import { test, expect } from '../fixtures'`. Each
fixture is opt-in — destructure only what the spec uses.

| Fixture | Scope | Notes |
| --- | --- | --- |
| `db` | worker | The same Prisma singleton the API uses. |
| `api` | test | Composes `ApiClient` over Playwright's `APIRequestContext`. |
| `testUser` | test | Fresh user via API register; unique email. |
| `adminUser` | test | Logs in as the deterministic seeded admin. |
| `authedPage` | test | Browser page with `testUser` token in localStorage. |
| `adminPage` | test | Same, for admin. |
| `auth` `catalog` `cart` `checkout` `orders` `adminProducts` | test | Page Objects. |

## Page Objects

One per page. Public methods describe **intent**, locators stay
private to the POM. Selector preference (in order):

1. `getByRole('button', { name })` — covers most actions.
2. `getByLabel('…')` for form fields with visible labels.
3. `getByPlaceholder('…')` for inputs without labels.
4. `data-testid` only where 1–3 are ambiguous (rows + cards that
   embed dynamic IDs).

## API clients

`tests/api-clients/` — one file per domain, composed by `ApiClient`.
Every response is parsed through a Zod schema from `@qa/contracts`;
contract drift fails at the parse step with the offending field
highlighted. Negative-path specs use `api.raw()` to inspect status
codes / error bodies directly.

```ts
const { token } = await api.auth.login(email, password);
const order = await api.checkout.checkout(token, { addressId });
const list = await api.orders.list(token);
```

## Adding a new test

1. Pick the right subject spec — does it belong in `cart.api.spec.ts`?
   `checkout.e2e.spec.ts`? Add to the existing file unless the
   surface you're testing is genuinely new.
2. Destructure only the fixtures you need.
3. Use the `db` fixture for seed + assertion; `api` for state setup;
   the POM for browser interaction.
4. Tag the test: `@smoke` for the gate-keeping subset, `@regression`
   for everything else. Optional subject tags (`@catalog`,
   `@checkout`, …) help with grep runs.

## Tag taxonomy

| Tag | Use |
| --- | --- |
| `@smoke` | Must pass on every PR. Runs in <30s. |
| `@sanity` | Smoke subset that also runs on chromium-desktop locally before pushing. |
| `@regression` | Default for non-smoke tests. |
| `@security`, `@negative`, `@boundary`, `@addresses`, `@catalog`, `@checkout`, `@orders`, `@cart`, `@admin`, `@auth`, `@empty` | Subject filters. |

## Notes

- The DB is **not** wiped between specs. Each spec creates its own
  products + users so parallel runs don't collide. The catalog test
  for `sort=price_asc` owns its own pair of products precisely
  because factory products from other parallel specs could otherwise
  undercut a global "cheapest first" assertion.
- The `/test/reset` API endpoint wipes **user-level** data only;
  seeded products are deterministic and never cleaned.
