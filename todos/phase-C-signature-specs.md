# Phase C — Six signature specs (within existing stack)

> Six surgical new specs, one per scenario dimension that's
> portfolio-distinctive. All reuse existing Playwright fixtures, the
> existing Prisma singleton, the existing Zod contracts. **No new
> tools.** The two specs that would normally call for new tools
> (concurrency → k6, fault-injection → Toxiproxy) are written within
> Playwright instead, preserving the platform's thesis.
>
> Time-box: one PR per spec, ~80 LOC each.

---

## Why

After Phases A + B, the platform has a *taxonomy* for negative / edge
/ security / etc., but the *deep* coverage on those dimensions is still
modest. These six specs target the dimensions an interviewer is most
likely to probe and that the existing suite is weakest on.

Each is independently shippable. Each one alone is a 90-second
interview talking point.

---

## What — six specs

### C.1 `tests/api/security.api.spec.ts` — RBAC denial matrix

`test.describe.each([…endpoint, …role])` table-driven matrix.

- Endpoints: every `POST/PATCH/DELETE /admin/*` plus a few admin GETs.
- Roles: `unauthenticated`, `USER`, `ADMIN`.
- For each row: `USER` and `unauthenticated` → 403 / 401; `ADMIN` → 2xx.

~15 tests from a single `describe.each`. Demonstrates table-driven /
data-driven testing in interview-readable form.

**Tags.** `@security`, `@sanity` (only on the `USER → 403` row), `@regression`.

---

### C.2 `tests/api/jwt-tamper.api.spec.ts` — token integrity

Four tests:
- Expired token → 401.
- Token signed with wrong secret → 401.
- Token with missing `sub` claim → 401.
- Token with `sub` swapped to another user's id → 403 (or 401 depending
  on how the API distinguishes — assert which one happens, that's the
  contract).

Uses the existing `JWT_SECRET` env to mint test tokens; small helper in
`tests/support/` keeps it DRY but **does not** require a new dep —
the existing `jsonwebtoken` transitive (via `@nestjs/jwt`) suffices.

**Tags.** `@security`, `@negative`, `@regression`.

---

### C.3 `tests/api/race-conditions.db.spec.ts` — concurrency / contention

Three tests, each using `Promise.all([…])` over the existing
`APIRequestContext` to drive parallel requests against the real API:

1. **Lost-update protection.** 50 parallel `addToCart(sameSku, +1)`
   calls → final cart row reads `quantity = 50` (no lost updates,
   no orphan `CartItem` rows).
2. **Stock-isolation under contention.** Seed `stock=3`. 5 parallel
   `checkout()` calls. Assert: exactly 3 succeed, 2 return a stock
   error. **DB stock = 0** (not negative). `AuditLog` count for
   `ORDER_PAID` = 3 (matches succeeded orders). No orphan `Order` rows
   in PENDING state.
3. **Promo cap holds.** Create a promo with `maxRedemptions=2`. 5
   parallel checkouts with that promo. Assert: exactly 2 redemptions
   succeed; the rest get a cap error; `timesRedeemed = 2` in DB
   afterward.

This **is** the load-testing story for an interview — written in
Playwright against the real API, asserting transaction isolation via
the same `PrismaClient` singleton. Replaces the dropped k6 Task E.

**Tags.** `@race`, `@regression`, `@slow` (concurrent calls take a bit;
fine to keep out of PR smoke).

---

### C.4 `tests/api/fault-injection.db.spec.ts` — transaction rollback under simulated failure

Requires a tiny API addition:

- In `apps/api/src/test/test.controller.ts`, behind `ENABLE_TEST_ENDPOINTS`,
  add `POST /test/inject-failure?at=<stage>` that sets a process-level
  flag.
- In `apps/api/src/orders/orders.service.ts`, inside the existing
  transaction, after `stock-decrement` (or wherever the test
  asserts), check the flag and `throw new Error('injected')` if set.
- The flag clears after the next `/test/reset`.

**Spec body.**
- Seed `stock=5`, fresh user, item in cart.
- `POST /test/inject-failure?at=stock-decrement`.
- `checkout()` → assert 5xx.
- DB assertions: no new `Order` row, no new `AuditLog` row, stock
  unchanged at 5, cart items still present.
- `POST /test/reset` clears the flag (next-test isolation).

This **is** the chaos story for an interview — fault injection driven
by an env-guarded test seam, transactional rollback verified via the
shared `db` fixture. Replaces the dropped Toxiproxy Task K.

**Tags.** `@race`, `@negative`, `@regression`.

---

### C.5 `tests/e2e/cross-feature-matrix.e2e.spec.ts` — data-driven UI matrix

`describe.each` over `(locale, region, paymentMethod)`:

- Locales: every entry in `SUPPORTED_LOCALES` from `@qa/contracts`.
- Regions: every seeded `Region` (`region_us`, `region_de`, `region_fr`).
- Payment methods: every `PaymentMethod` enum value.

~12 combinations (filter to plausible ones — `region_de` only with
EUR-formatting locales, etc.). One full checkout per combination
using existing POMs. Assert:
- Currency string formatting (cross-check against `formatMoney`).
- Locale-translated copy on confirmation page (cross-check against
  `apps/web/messages/<locale>.json`).
- Payment-method-specific copy on the confirmation badge.

Demonstrates **data-driven / matrix testing** — the most common QA
interview prompt that the current suite doesn't loudly showcase.

**Tags.** `@i18n`, `@geo`, `@checkout`, `@regression`. Some
combinations also tagged `@sanity` (one canonical row).

---

### C.6 `tests/e2e/empty-states.e2e.spec.ts` — empty-state showcase

One spec, six assertions on a fresh user:
- Empty cart shows the empty-cart copy / illustration.
- Empty wishlist same.
- Empty orders same.
- Empty addresses same.
- Empty stock alerts same.
- Empty loyalty (balance = 0, no transactions).

For each: navigate, assert empty-state element via `getByText` or
`getByRole`, screenshot (optional — keep it accessible-tree-only to
avoid a visual-snapshot dependency for now).

**Tags.** `@empty`, `@regression`. One row also `@sanity`.

---

## Files to change

- 6 new spec files under `tests/api/` (4) and `tests/e2e/` (2).
- 1 new `tests/support/jwt-helpers.ts` (helper for C.2).
- 2 small source edits for C.4 only:
  - `apps/api/src/test/test.controller.ts` — add the
    `/test/inject-failure` endpoint, guarded by `ENABLE_TEST_ENDPOINTS`.
  - `apps/api/src/orders/orders.service.ts` — read the flag inside the
    existing checkout transaction at one well-defined stage; throw if
    set.

No fixture changes. No new dependencies. No POM rewrites.

---

## Acceptance

- 6 new spec files compile (`pnpm --filter @qa/tests typecheck`).
- Full suite green: `pnpm --filter @qa/tests test`.
- `pnpm test:race` → ≥ 3 tests.
- `pnpm test:security` → at least +15 tests vs. Phase B baseline.
- `pnpm test:empty` → +6 tests vs. Phase B.
- C.4 fault-injection: flipping the flag locally and re-running the
  spec produces a clean 5xx + DB-untouched assertion failure trace if
  the rollback regresses.

## Scope guard

- **No new tools.** Concurrency uses `Promise.all`; fault-injection
  uses the test seam. Do not reach for k6 or Toxiproxy.
- **No mocking of the DB.** All six specs hit the real Postgres via
  the same `PrismaClient` singleton.
- **C.4 fault-injection knob must be env-guarded.** The endpoint must
  return 404 when `ENABLE_TEST_ENDPOINTS` is unset (mirror the existing
  `/test/reset` guard pattern).
- **C.3 race-conditions must not depend on parallel-test ordering.**
  Each test seeds its own products / users via factories.
- Do not extend Page Objects for C.5 unless absolutely required —
  reuse the existing checkout/cart POMs and pass locale/region via
  the existing `setLocale` API call.

## Dependencies

Phases A + B (tag scripts must exist; `@race`, `@security`, `@empty`
tags must be defined).

## Out of scope (deliberately)

- A second fault-injection point (more stages) — start with one.
- An RBAC matrix on the *web* surface — C.1 covers it at API where
  RBAC is enforced; UI redirect is already covered.
- A real load tool — explicitly replaced by C.3.

## Status — ✅ Built (C.1 – C.6, one commit per spec)

- **C.1 `tests/api/security.api.spec.ts`** — RBAC denial matrix via `test.describe.each` over five admin endpoints × three roles (`9dfabe6`). 15 tests; one row per `(endpoint, role)` checked.
- **C.2 `tests/api/jwt-tamper.api.spec.ts`** — four JWT integrity tests using a hand-rolled HS256 minter (`tests/support/jwt-helpers.ts`) — no `jsonwebtoken` dep leak into the test workspace (`bf12263`).
- **C.3 `tests/api/race-conditions.db.spec.ts`** — three `Promise.all` concurrency storms (lost-update, stock isolation, promo cap) (`27956d4`). Replaces the dropped k6 path; runs in ~1.4 s. The "promo cap holds" assertion surfaced a real non-atomic redemption check in `PromoService.recordRedemption` — fixed in a follow-up by switching to a conditional `tx.$executeRaw UPDATE ... WHERE timesRedeemed < maxRedemptions`.
- **C.4 `tests/api/fault-injection.db.spec.ts`** — env-guarded process-level chaos seam (`98e0f91`), per-userId scoped so it runs safely in parallel with other checkout-touching specs (post-merge follow-up). One `inject-failure?at=stock-decrement&userId=<u>` test asserting full transactional rollback.
- **C.5 `tests/e2e/cross-feature-matrix.e2e.spec.ts`** — `describe.each` over (locale × payment) with currency-format + locale-copy assertions per row (`e2667d6`).
- **C.6 `tests/e2e/empty-states.e2e.spec.ts`** — six empty-state assertions (cart/wishlist/orders/addresses via DOM; stock-alerts/loyalty via API) (`d204291`).

All six green in PR #18's CI. `pnpm test:race`, `pnpm test:security`, `pnpm test:empty` each return populated lists.
