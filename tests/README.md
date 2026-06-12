# Tests

Six e2e specs, six API specs, six page objects, six API clients.

```
tests/
  e2e/           smoke catalog cart checkout orders admin
  api/           auth products cart checkout orders admin-products
  api-clients/   base + auth, products, cart, checkout, orders, admin (+ index)
  pages/         auth catalog cart checkout orders admin
  factories/     user, product, address, admin-product
  fixtures/      composable Playwright fixtures (spec entry point)
  setup/         auth.setup.ts → shared storageState files
  support/       matchers, jwt-helpers, keys, seed helpers
```

## Running

```sh
pnpm -F @qa/tests test                 # full suite, chromium-desktop
pnpm -F @qa/tests test:smoke           # @smoke only
pnpm -F @qa/tests test:ui              # interactive UI mode
pnpm -F @qa/tests exec playwright test e2e/checkout.e2e.spec.ts
pnpm -F @qa/tests exec playwright test --grep "cancel button on a PAID"
```

Playwright boots the API + web and reuses anything already listening.

## Fixtures

Spec entry: `import { test, expect } from '../fixtures'`. Each fixture
is opt-in.

| Fixture | Scope | Notes |
| --- | --- | --- |
| `db` | worker | The same Prisma singleton the API uses. |
| `api` | test | `ApiClient` over Playwright's `APIRequestContext`. |
| `testUser` / `adminUser` | test | Fresh / seeded admin user. |
| `authedPage` / `adminPage` | test | Page with the user's token in localStorage. |
| `auth` `catalog` `cart` `checkout` `orders` `adminProducts` | test | Page Objects. |

## Page Objects

One per page. Methods describe **intent**; locators stay private.
Selector preference:

1. `getByRole('button', { name })`
2. `getByLabel('…')` for labelled form fields
3. `getByPlaceholder('…')` for unlabelled inputs
4. `data-testid` only where 1–3 are ambiguous (rows + cards with
   dynamic IDs)

## API clients

`tests/api-clients/` — one file per domain. Every response is parsed
through a Zod schema from `@qa/contracts`; drift fails at the parse step
with the offending field highlighted. Negative-path specs use
`api.raw()` to inspect status codes / error bodies directly.

```ts
const { token } = await api.auth.login(email, password);
const order = await api.checkout.checkout(token, { addressId });
const list = await api.orders.list(token);
```

## Adding a new test

1. Add to the existing subject spec (`cart.api.spec.ts`, `checkout.e2e.spec.ts`,
   …) unless the surface is genuinely new.
2. Destructure only the fixtures you need.
3. Use `db` for seed + assertion, `api` for state setup, the POM for UI.
4. Tag: `@smoke` for the PR gate, `@regression` for everything else.
   Subject tags (`@catalog`, `@checkout`, …) help with grep runs.

## Assertion patterns

```ts
// Web matcher: count, not "$count items"
await expect(authedPage).toHaveCartCount(2);

// Poll for an async DB side-effect
await expect
  .poll(() => db.auditLog.count({ where: { action: 'ORDER_PAID' } }))
  .toBe(1);

// Negative path: inspect raw response without throwing
const res = await api.raw().post(`${API_BASE}/orders`, {
  headers: { Authorization: `Bearer ${other.token}` },
});
expect(res.status()).toBe(403);
```

## Debugging a failure

1. `pnpm -F @qa/tests exec playwright show-report` opens the HTML
   report. Failures expand into the `test.step(...)` tree.
2. Open the **Trace** tab — snapshots, network calls, console logs,
   frame-by-frame replay. Single best Playwright debugging tool.
3. CI uploads `tests/playwright-report` as an artifact; download and
   open `index.html` locally.

Locally, traces are kept on first retry only (`trace: 'on-first-retry'`).
Use `--trace=on` on the CLI to force them on every run.

## Conventions worth knowing

- The DB is **not** wiped between specs. Each spec creates its own
  products + users so parallel runs don't collide. The `sort=price_asc`
  catalog test owns its own pair of products for the same reason.
- The `/test/reset` API endpoint wipes **user-level** data only; seeded
  products are deterministic and never cleaned.
