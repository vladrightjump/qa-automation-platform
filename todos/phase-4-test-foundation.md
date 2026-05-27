# Phase 4 — Test Foundation

**Objective:** The fixtures, factories, clients, and config the suites build on.

**Build:**
- `packages/contracts`: Zod schemas for User/Product/Order; derive types from them.
- `tests/support/api-client.ts`: typed wrapper over `APIRequestContext` (createUser, login, seedProduct, addToCart, checkout…).
- `tests/factories`: faker-backed builders (UserFactory, ProductFactory) producing valid Zod-conformant data.
- `tests/fixtures/index.ts`: composable fixtures — `db` (worker-scoped Prisma client), `api` (test-scoped client), `testUser` (created via API, isolated per test), `authedPage` (browser context with injected token / `storageState`).
- `playwright.config.ts`: projects, parallelism, sharding-ready, trace/video/screenshot on failure, HTML reporter, `@smoke`/`@regression` grep wiring, `webServer` to boot api+web (or assume already running).

**Definition of Done:** A trivial smoke spec using `authedPage` + `api` + `db` passes locally.

**Checkpoint:** Report the fixtures file and `playwright.config.ts`. Stop.

---

## ✅ Status — DONE (uncommitted)

DoD met: `pnpm test` boots API + web via Playwright's `webServer` and the smoke spec exercising `db` + `api` + `authedPage` passes in ~500 ms. `pnpm lint` + `pnpm typecheck` 10/10.

### As built

- **`@qa/contracts`** — Zod schemas for `User` / `Product` / `Cart` / `CartItem` / `Order` / `OrderItem` / `OrderStatus` / `AuthResult`, plus `ProductListSchema` / `OrderListSchema` helpers. Types are inferred (`z.infer<...>`) — single source of truth. Builds to `dist/` (`tsc -p tsconfig.build.json`), `main` → `./dist/index.js`, like `@qa/db`.
- **`tests/support/api-client.ts`** — `ApiClient` wraps Playwright's `APIRequestContext`. Every response is parsed through the matching Zod schema before it returns, so structural drift fails *at the client* with a clear contract error rather than as a confusing `undefined` later. Methods: `register`, `login`, `listProducts`, `getProduct`, `getCart`, `addToCart`, `removeFromCart`, `checkout`, `listOrders`, `getOrder`, `resetTestData`, plus a `raw()` escape hatch for negative-path specs that need to inspect a non-OK response directly.
- **`tests/support/keys.ts`** — exports `TOKEN_KEY` and `USER_KEY` (the `localStorage` keys mirrored from `apps/web/lib/auth.tsx`) so the `authedPage` fixture can inject without importing from the Next app.
- **`tests/factories/`** — `UserFactory.build()` (unique faker email + 12-char password) and `ProductFactory.build()` (`prod_` + 10 alphanum + commerce name/desc/price/stock) for specs that seed straight into the DB.
- **`tests/fixtures/index.ts`** — composable Playwright fixtures:
  - `db` — **worker-scoped**, the singleton `PrismaClient` from `@qa/db`. Same instance the API uses.
  - `api` — test-scoped, constructed from Playwright's `request` context.
  - `testUser` — test-scoped, fresh user per test (faker email, registered via API).
  - `authedPage` — test-scoped browser page with the testUser's token + user payload injected via `page.addInitScript` *before* the app loads, so the AuthProvider's hydration sees a signed-in session.
- **`tests/playwright.config.ts`** — single Chromium project, `fullyParallel: true`, retries `1` (CI) / `0` (local), `workers: '50%'` in CI, HTML + list reporters, trace on first retry, video / screenshot on failure. Loads `.env` from repo root via `dotenv` (paths resolved with `import.meta.url`). `webServer` boots the **compiled** API (`@qa/api start`) and Next.js (`@qa/web start`) from repo root with `reuseExistingServer: !CI` — local devs share running servers; CI always spawns fresh.
- **`tests/e2e/smoke.e2e.spec.ts`** — DoD spec. Confirms (1) the DB has the four seeded products, (2) the API serves them with a Zod-valid shape, (3) the storefront renders the `authedPage` with the nav-orders link (auth-only) and the `product-card-prod_widget` (proves client-side fetch + hydration completes).

### Drive-by fix: CORS

The storefront fetches `:3001` from `:3000`. Phase 2 only verified via `curl` (no CORS enforcement), so the missing `Access-Control-Allow-Origin` header didn't surface until the smoke spec opened a real browser. `apps/api/src/main.ts` now does `app.enableCors({ origin: true, credentials: true })`; permissive in dev/CI, lock by origin in any real deploy.

### Carry-over for Phase 5

- Replace the inline types in `apps/web/lib/api.ts` with the inferred types from `@qa/contracts` (the schemas now exist).
- Use `api.resetTestData()` in `test.beforeEach` / suite-level hooks to isolate stock-mutating tests.
- Negative-path specs can call `api.raw().get(...)` to introspect non-OK responses.
