# Architecture

Design notes for the QA Automation Platform. The [README](./README.md) covers the *what* and *how to run*; this file is the *why*.

---

## 1. The three-layer validation philosophy

A given user flow — say, checkout — has three layers where it could plausibly succeed or break:

1. **API layer.** The HTTP request/response contract: status codes, response shape, math (`totalCents = Σ priceCents × quantity`), authentication, validation.
2. **DB layer.** The hidden state mutation: stock decrement, `Order.status = PAID`, an `AuditLog` row written, `CartItem`s deleted, transactional rollback on failure.
3. **UI layer.** The user-observable browser behavior: a clickable "Add to cart" button, a navbar count that updates, a confirmation page with an order status badge.

Most test suites pick **one** of these layers and call it done. This project picks **all three**, and crucially, it picks them **in the same test** when it matters.

### Why three layers

Each layer catches a class of bug the others can't:

- **API alone** misses *silent side-effect bugs* — a checkout that returns 200 with the right shape but forgets to decrement stock. The API response looks fine.
- **DB alone** misses *contract drift* — the side effect is correct, but a field was renamed and every client breaks. The DB is happy.
- **UI alone** misses *anything below the surface* — the page renders, but the underlying state may be wrong, and you'll only find out next session.

### The signature spec

[`tests/api/checkout.db.spec.ts`](./tests/api/checkout.db.spec.ts) is the project's signature: one test, one transaction, four DB assertions covering side-effects the API response itself never returns.

```ts
await api.addToCart(testUser.token, product.id, 3);
const order = await api.checkout(testUser.token);

// 1. Stock decremented (10 → 7) — invisible in the response
const updated = await db.product.findUniqueOrThrow({ where: { id: product.id } });
expect(updated.stock).toBe(7);

// 2. AuditLog row with metadata — entirely invisible to the API surface
const audits = await db.auditLog.findMany({
  where: { entityId: order.id, action: 'ORDER_PAID' },
});
expect(audits[0]?.metadata).toMatchObject({ totalCents: 6000, itemCount: 1 });

// 3. Cart items cleared, cart row preserved (different lifecycles)
const items = await db.cartItem.findMany({ where: { cart: { userId: testUser.id } } });
expect(items).toHaveLength(0);

// 4. Order status PAID — visible AND double-checked in DB
const dbOrder = await db.order.findUniqueOrThrow({ where: { id: order.id } });
expect(dbOrder.status).toBe('PAID');
```

The companion test in the same file forces a mid-flight stock change and asserts the **whole transaction rolls back** — sibling stock untouched, no audit row written. This is the kind of thing you can only prove from the DB layer.

---

## 2. Fixture composition

Tests `import { test, expect } from '../fixtures'`. Four composable fixtures, each scoped to do as little as possible:

| Fixture | Scope | What it provides | Built from |
|---|---|---|---|
| `db` | **worker** | The singleton `PrismaClient` from `@qa/db` — same instance the API uses | shared across all tests on a worker |
| `api` | test | Typed wrapper over Playwright's `APIRequestContext`; every response is parsed through the matching Zod schema before return | built from the test's `request` context |
| `testUser` | test | Fresh user (faker email, registered via API) → `{ id, email, password, token }` | depends on `api` |
| `authedPage` | test | `page` with the testUser's token + payload injected via `page.addInitScript(…)` **before** the app loads | depends on `page` + `testUser` |

The chain — `authedPage` ← `testUser` ← `api` ← (Playwright's `request`) — means a spec that just declares `authedPage` gets a real user registered against the running API, a real JWT signed by it, and a real browser session opening the storefront with that user "already signed in" before any React code runs. The Phase 3 storefront's `AuthProvider` reads `localStorage` on mount and sees a logged-in state — same as a returning real user.

### Why `db` is worker-scoped

Tests share the worker's Prisma client. Closing it between tests would race with concurrent queries; reconstructing it would defeat connection-pool reuse. Worker scope = one client per worker, lives for the worker's life, no explicit teardown.

### Why `authedPage` uses `addInitScript`

The script runs *before* any of the page's own scripts on every navigation. The storefront's `AuthProvider.useEffect` reads `localStorage` synchronously inside its hydration step — by the time it runs, the keys are already there.

The naive alternative (call `page.evaluate(() => localStorage.setItem(...))` *after* `page.goto`) leaves a race window between page load and the storage being set. We hit this exact class of race in Phase 5 — see §4.

---

## 3. Isolation strategy

The full suite is `fullyParallel: true`. Tests across files, *and* tests within a file, run concurrently on multiple workers. Two flavors of state share that pool:

### Per-test, per-user state — **no contention**

Each test gets a fresh `testUser` (faker email → guaranteed unique on the `User.email` unique index). The user owns their cart, their orders, their audit log rows. Parallel tests creating users cannot collide.

Specs **do not** call `api.resetTestData()`. The `/test/reset` endpoint is a *suite-level* hook; calling it inside a test would wipe other parallel tests' users.

### Globally-shared state — **read-only, or own-the-state**

- **Seeded products** (`prod_widget`, `prod_gizmo`, `prod_thingamajig`, `prod_oos`) are **read-only** across tests. Specs that just *browse* or *view* use them. The OOS path uses `prod_oos` with stock=0 (which is what the seed shipped, so it stays 0).
- **Stock-mutating tests** — anything that calls `checkout` — create their own products via `ProductFactory.build()` + `db.product.create()` with unique IDs. Each test owns its baseline. No two parallel checkouts touch the same SKU.

This pattern is the project's answer to the classic "tests pass alone, fail together" parallel hazard. Stock state is a shared mutable resource → each test materializes its own copy.

### What about Postgres connections?

The worker-scoped Prisma client has a default pool. Workers are bounded by Playwright (`50%` of CPUs in CI). The pool × workers easily fits within Postgres's `max_connections` for any reasonable shard count. No connection storms.

---

## 4. Why API-driven setup

Global standard from [`todos/architecture.md`](./todos/architecture.md):

> Set up state via API, never via UI, unless the UI action *is* the thing under test.

Why:

- **Speed.** Registering a user via API is a single HTTP round-trip. Doing it via the UI is page-load → fill-form → click-submit → wait-for-redirect — at least an order of magnitude slower.
- **Reliability.** UI walks fail for reasons unrelated to the spec — selector drift, animation timing, ad-hoc validation messaging. API calls fail only when the API actually broke.
- **Intent clarity.** A test for "checkout drops cart items" should *not* spend 10 lines of setup logging in. The Page Object methods read like the user's intent (`storefront.addToCart(id)`, `cart.proceedToCheckout()`) **only** for the assertion path.

### The test-only seam

`POST /test/reset` is the cleanest version of this. It's a server-side endpoint guarded by `ENABLE_TEST_ENDPOINTS=true` (off in any production-shaped deploy → returns 404). Tests *could* call `prisma.user.deleteMany()` directly via the `db` fixture, but the API seam keeps the *contract* of what test resets do under server control — if the SUT later adds a "deleting users requires de-indexing search" step, the test seam picks it up automatically.

### What this trades away

The trade is that the UI's own setup paths (the registration form, the cart add-to-cart click) get less coverage by indirect means. So we have **explicit** UI specs covering those paths (`AuthForm` rejects bad creds → toast; `ProductCard` "Add to cart" disables when OOS). The dedicated UI specs cover what API-driven setup doesn't.

---

## 5. Real cross-layer bugs this suite caught

The build wasn't bug-free. The interesting part is which layer surfaced each one.

### CORS missing on the API (caught by Phase 4)

Phase 2 verified the API end-to-end with `curl`. Every endpoint returned 200, the curl flow passed. **The first browser-based smoke test in Phase 4 immediately failed** — `api.listProducts()` from the storefront's client-side fetch was blocked by the browser before it ever left the page. `curl` doesn't enforce CORS; a real browser does.

Fix: `app.enableCors({ origin: true, credentials: true })` in `apps/api/src/main.ts`. The bug existed for two phases — Phase 4 found it inside its DoD run.

### React hydration race in the storefront (caught by Phase 5)

Phase 4's smoke spec hydrated the page, found the navbar, and called it good. Phase 5's checkout flow was the first spec to **navigate from `/` to `/cart` after login** — and it bounced to `/login` every time.

Root cause: the `AuthProvider`'s initial state was `{ token: null }`. Its hydration `useEffect` read `localStorage` and set the token, but `/cart`'s own `useEffect` ran *first* against the initial state, saw `token === null`, and called `router.push('/login')`. By the time hydration completed, the cart page had already navigated away.

Fix: `AuthProvider` now exposes `isHydrated: boolean`. The four protected pages (`/cart`, `/checkout`, `/orders`, `/orders/[id]`) all gate their redirect/fetch on `if (!isHydrated) return;`. Unauthenticated users still redirect — just one tick later, after we actually know they're unauthed.

This is **precisely the kind of bug that motivates this project's existence**. A test layer that only checks "page renders + navbar visible" misses it. A test that *navigates between protected routes* exposes it on first run.

### Decorator metadata stripped by tsx (caught by Phase 2 boot)

NestJS DI uses `emitDecoratorMetadata`. `tsx` (esbuild) doesn't emit it. The first API boot attempt with `tsx watch` produced `this.products is undefined` runtime errors — the controller's constructor parameter was never injected.

Fix: `apps/api` runtime stack switched to `ts-node-dev` (which compiles via `tsc` and respects `emitDecoratorMetadata`). For builds: `tsc → dist/`, run via `node dist/main.js`. Documented in [`todos/phase-2-api.md`](./todos/phase-2-api.md).

---

## 6. Test framework layers (portfolio surface)

The Playwright suite is layered to demonstrate the framework's full surface, not just `click().then(expect())`:

| Layer | Where | What it shows off |
|---|---|---|
| **Selectors** | `tests/pages/*.page.ts` | Lead with `getByRole` / `getByLabel` / `getByText` / `getByPlaceholder`; `data-testid` only where the element has no stable accessible name. Doubles as a passive a11y check. |
| **Fixtures** | `tests/fixtures/index.ts` | `db` (worker-scoped Prisma), `api` (Zod-validating client), `testUser`/`adminUser` (per-test users via API), `authedPage`/`adminPage` (token injected into localStorage), plus all 5 Page Objects as fixtures so specs just destructure them. |
| **Setup project** | `tests/setup/auth.setup.ts` | Runs **once** before any test project, writes `tests/.auth/{user,admin}.json` storageState files. Visual project consumes them; per-test fixtures stay the default elsewhere. Both auth patterns demonstrated. |
| **Custom matchers** | `tests/support/matchers.ts` | `toHaveCartCount(n)` (auto-retrying navbar badge read), `toMatchContract(schema)` (Zod parse with path-aware diff), `toBeAccessible(opts)` (`@axe-core/playwright` wrapper). Registered via `expect.extend`. |
| **Smart waits** | smoke checkout, network mocking specs | `test.step('phase', …)` for HTML-report grouping, `expect.poll` for eventual conditions (audit-log read), `expect.soft` for assertion accumulation, `page.waitForResponse` over DOM polling for server-confirmed UI updates. |
| **Network mocking** | `tests/e2e/network-mocking.e2e.spec.ts` | `page.route` covering 500 / 401 / slow / contract-drift paths — exercises UI states the real backend can't easily produce. |
| **a11y scans** | `tests/e2e/a11y.e2e.spec.ts` | Axe core run via `toBeAccessible` against every major route, tagged `@a11y @regression`. Surfaced as `pnpm test:a11y`. |
| **Visual regression** | `tests/e2e/*.visual.spec.ts` | `toHaveScreenshot` with masks on dynamic regions. Lives in a separate `visual` project so screenshots don't tag along with every shard. Update baselines via `pnpm test:update-snapshots`. |
| **Multi-project config** | `tests/playwright.config.ts` + `tests/support/devices.ts` | `setup` → `chromium-desktop` (default) / phone matrix `chromium-mobile` (Pixel 5) + `webkit-mobile` (iPhone 14), both `@smoke ∪ @mobile` / tablet matrix `tablet-ipad` + `tablet-android` (Galaxy Tab S4), both `@smoke ∪ @tablet` / `webkit` (Desktop Safari, @smoke) / `visual` (storageState + trace=on, desktop screenshots) / `tablet-visual` (iPad screenshots of the localized storefront). Per-project trace and screenshot policies; matrix lives in `support/devices.ts` so the config stays terse. |
| **Reporters** | `tests/playwright.config.ts` | `html` (always), `list` (always), `junit` (CI consumption), `github` (PR annotations, CI-only). |

The point isn't to use every pattern in every test — it's that each pattern has a clear home and an obvious "why now" trigger.

---

## 7. File map — where to find what

| Concern | Location |
|---|---|
| The signature DB-side-effects assertion | [`tests/api/checkout.db.spec.ts`](./tests/api/checkout.db.spec.ts) |
| Zod schemas (single source of truth for types) | [`packages/contracts/src/index.ts`](./packages/contracts/src/index.ts) |
| Singleton PrismaClient | [`packages/db/src/index.ts`](./packages/db/src/index.ts) |
| Prisma schema | [`packages/db/prisma/schema.prisma`](./packages/db/prisma/schema.prisma) |
| Composable fixtures | [`tests/fixtures/index.ts`](./tests/fixtures/index.ts) |
| Typed API client + Zod parsing | [`tests/support/api-client.ts`](./tests/support/api-client.ts) |
| Page Objects | [`tests/pages/`](./tests/pages/) |
| The checkout transaction (the side-effects under test) | [`apps/api/src/orders/orders.service.ts`](./apps/api/src/orders/orders.service.ts) |
| The `/test/reset` seam | [`apps/api/src/test/`](./apps/api/src/test/) |
| Auth hydration (the bug from §5) | [`apps/web/lib/auth.tsx`](./apps/web/lib/auth.tsx) |
| Playwright config (multi-project, reporters, timeouts) | [`tests/playwright.config.ts`](./tests/playwright.config.ts) |
| Device-emulation matrix (phone + tablet projects) | [`tests/support/devices.ts`](./tests/support/devices.ts) |
| i18n contracts / `formatMoney` / FX table | [`packages/contracts/src/i18n.ts`](./packages/contracts/src/i18n.ts) |
| i18n runtime (LocaleProvider, message catalogs) | [`apps/web/lib/i18n.tsx`](./apps/web/lib/i18n.tsx), [`apps/web/messages/`](./apps/web/messages/) |
| GeoBanner + LocaleSwitcher | [`apps/web/components/GeoBanner.tsx`](./apps/web/components/GeoBanner.tsx), [`apps/web/components/LocaleSwitcher.tsx`](./apps/web/components/LocaleSwitcher.tsx) |
| Custom expect matchers (`toHaveCartCount`, `toMatchContract`, `toBeAccessible`) | [`tests/support/matchers.ts`](./tests/support/matchers.ts) |
| Setup project (storageState producer) | [`tests/setup/auth.setup.ts`](./tests/setup/auth.setup.ts) |
| Network mocking, a11y, visual specs | [`tests/e2e/network-mocking.e2e.spec.ts`](./tests/e2e/network-mocking.e2e.spec.ts), [`a11y.e2e.spec.ts`](./tests/e2e/a11y.e2e.spec.ts), [`*.visual.spec.ts`](./tests/e2e/) |
| Perf budgets (committed source of truth) | [`tests/perf/budgets.json`](./tests/perf/budgets.json) |
| Lighthouse + Web Vitals perf specs | [`tests/perf/lighthouse/`](./tests/perf/lighthouse/), [`tests/perf/web-vitals.perf.spec.ts`](./tests/perf/web-vitals.perf.spec.ts) |
| Perf seed seam (bulk products) | [`tests/perf/runner/seed.ts`](./tests/perf/runner/seed.ts), [`apps/api/src/test/test.controller.ts`](./apps/api/src/test/test.controller.ts) |
| CI workflows | [`.github/workflows/ci.yml`](./.github/workflows/ci.yml), [`.github/workflows/perf.yml`](./.github/workflows/perf.yml) |
| Playwright MCP config | [`.mcp.json`](./.mcp.json) |
| Build plan — phase by phase, with "as built" status blocks | [`todos/`](./todos/) |
