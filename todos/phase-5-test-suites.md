# Phase 5 — Test Suites Across All Layers

**Objective:** Real coverage demonstrating the API → DB → UI through-line.

**Build:**
- **API layer** (`tests/api/*.api.spec.ts`): status + Zod-contract validation on each endpoint; auth, cart math, checkout totals.
- **DB layer** (`tests/api/*.db.spec.ts`): assert side effects invisible to the API response — stock decrement, `OrderStatus` transitions, AuditLog rows, cart cleared after checkout.
- **UI hybrid** (`tests/e2e/*.e2e.spec.ts`): state seeded via API, flow driven in the browser via Page Objects, ground truth verified in the DB with `toPass`.
- Page Objects in `tests/pages` for storefront/cart/checkout.
- Cover the five flows; include at least one negative path per flow (out-of-stock, invalid auth, empty cart).

**Definition of Done:** `pnpm test` green locally; `@smoke` subset runs fast; failures produce traces.

**Checkpoint:** Report the spec inventory (file → what it proves) and total counts by tag. Stop.

---

## ✅ Status — DONE (uncommitted)

DoD met: `pnpm test` → **32/32 green in ~6s**, `pnpm test:smoke` → **9 specs in 5.1s**, failures produce HTML report + screenshot + video + trace (configured `trace: 'on-first-retry'`, `video: 'retain-on-failure'`, `screenshot: 'only-on-failure'`). `pnpm lint` + `pnpm typecheck` 10/10.

### Spec inventory — file → what it proves

**API layer** (`tests/api/*.api.spec.ts`)

| File | Tests | What it proves |
|---|---|---|
| `auth.api.spec.ts` | 5 (2 smoke, 3 reg) | register issues Zod-valid token; login round-trips; duplicate email → 409; weak email/password → 400; wrong password → 401 |
| `products.api.spec.ts` | 4 (1 smoke, 3 reg) | list returns ProductList-shaped data with seeded ids; deterministic sort; get by id matches schema; missing → 404 |
| `cart.api.spec.ts` | 6 (1 smoke, 5 reg) | unauth → 401; add returns cart with line; double-add increments quantity; unknown product → 404; quantity 0 → 400; remove drops line |
| `orders.api.spec.ts` | 6 (1 smoke, 5 reg) | empty cart → 400; out-of-stock → 400 with `/stock/i`; happy path PAID + totals math; list orders user-scoped; another user's order → 403; missing → 404 |

**DB layer** (`tests/api/*.db.spec.ts`)

| File | Tests | What it proves |
|---|---|---|
| `checkout.db.spec.ts` | 2 (1 smoke, 1 reg) | **the signature assertion** — stock decremented, OrderStatus PAID, AuditLog row with metadata, cart cleared, cart row preserved. Plus: a forced mid-flight stock change rolls the whole txn back (no audit row, sibling stock untouched) |
| `auth.db.spec.ts` | 1 (1 reg) | registered user's `password` is a bcrypt hash (`/^\$2[ayb]\$/`) — *never* plaintext |

**UI hybrid** (`tests/e2e/*.e2e.spec.ts`)

| File | Tests | What it proves |
|---|---|---|
| `smoke.e2e.spec.ts` | 1 (smoke) | three-fixture canary: DB seed, API contract, authedPage hydration |
| `browse.e2e.spec.ts` | 2 (1 smoke, 1 reg) | product list renders seeded cards; detail page reachable |
| `checkout.e2e.spec.ts` | 2 (1 smoke, 1 reg) | full UI flow (storefront → cart → checkout → `/orders/[id]` with status PAID) **with DB verification via `expect.poll`**; remove-from-cart updates UI subtotal AND DB |
| `negative.e2e.spec.ts` | 3 (reg) | unauthed `/cart` redirects to `/login`; out-of-stock card shows disabled "Out of stock"; bad login → toast-error |

**Totals: 32 tests — 9 `@smoke`, 23 `@regression`.**

### Page Objects (`tests/pages/`)

- `storefront.page.ts` — `goto()`, `productCard(id)`, `addToCart(id)`, `cartCount()`
- `cart.page.ts` — `goto()`, `item(id)`, `subtotal()`, `removeItem(id)`, `proceedToCheckout()`
- `checkout.page.ts` — `goto()`, `placeOrder()`, `orderStatus()`, `orderId()`

Methods expose **intent**, not click mechanics — per the global standard.

### Per-test isolation

- Every test creates its own `testUser` (faker email, unique per test).
- Stock-mutating tests **create their own fresh products** via `ProductFactory` + `db.product.create()` so parallel workers don't race on the seeded SKUs. Read-only specs use the seeded `prod_widget` / `prod_gizmo` / `prod_oos` IDs.
- No spec calls `api.resetTestData()` — that would wipe other parallel tests' users. The reset endpoint is reserved for suite-level hooks if ever needed.

### Drive-by fix flagged: hydration race in the storefront

The first `pnpm test` run uncovered a real bug in `apps/web`. Protected pages' `useEffect` ran against the AuthProvider's initial state (`token: null`) **before** the localStorage-hydration effect populated the token — so `authedPage` tests landing on `/cart` got bounced to `/login` instantly.

Fix: `AuthProvider` now exposes `isHydrated: boolean` (false until the storage-read effect finishes). `/cart`, `/checkout`, `/orders`, `/orders/[id]` all gate their redirect / fetch on `if (!isHydrated) return;`. Unauthenticated users still redirect — just one tick later, after we actually know they're unauthed.

This is the kind of issue the project exists to surface: cross-layer state coordination invisible to a curl-only verification. Phase 5 caught it on first run.

### Carry-over

- Phase 6 will run this exact suite in CI with sharding + the `webServer` config (already `reuseExistingServer: !isCI`).
- Failures land traces under `tests/test-results/` and the HTML report under `tests/playwright-report/` — Phase 6 uploads these as artifacts.
