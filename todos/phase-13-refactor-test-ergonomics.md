# Phase 13 — Refactor: test ergonomics + one tag convention

> **Type:** Test-suite refactor. Behaviour of the SUT is untouched; this cleans
> up the *tests themselves*. Net assertion coverage must not drop.

**Problem / motivation:**
- **Setup duplication:** the "register → default address → add to cart →
  checkout (PAID)" recipe is re-implemented per spec (`placePaidOrder` in
  `order-returns`/`admin-orders`, `earnViaCheckout` in `loyalty`, plus inline
  copies in cart/checkout/order e2e). Each new feature re-wrote it.
- **Monolithic client:** `tests/support/api-client.ts` is **557 lines** — every
  domain (auth, products, cart, orders, promo, addresses, wishlist, reviews,
  admin, stock-alerts, loyalty) in one class.
- **Two tag conventions:** every `tests/api/*.spec.ts` still uses **title-based**
  `@smoke`/`@regression` tags, while e2e specs use Playwright **native**
  `tag: [...]` + feature tags. `TESTING.md` §2 and `phase-9` both flag the
  migration as an explicit follow-up; the label-driven CI greps tags, so one
  convention matters.

**Objective:** Shared seeding helpers, a domain-split client, and a single
native-tag convention across all specs.

---

## Build

**Seeding helpers** (`tests/support/seed.ts`):
- `seedPaidOrder(api, db, { priceCents?, stock?, qty?, token })` → returns the
  created `Order` (the de-duped `placePaidOrder`).
- `withDefaultAddress(api, token)` and `seedProduct(db, overrides)` shortcuts.
- Adopt in the api/e2e specs that re-implement them; delete the local copies.
- Consider exposing `seedPaidOrder` as a fixture in `tests/fixtures/index.ts`.

**Client split** (`tests/support/api-client.ts`):
- Break into per-domain modules (`clients/products.ts`, `cart.ts`, `orders.ts`,
  `admin.ts`, `loyalty.ts`, `stock-alerts.ts`, …) composed into one `ApiClient`
  (mixins or delegation), re-exported so specs keep `import { ApiClient }`.
  *Or* — if the team prefers one file — document that decision and stop here.

**Tag migration** (`tests/api/*.spec.ts`):
- Convert title-based tags to native `test('…', { tag: ['@regression', '@<feature>'] }, …)`
  with the right feature tag (`@cart`, `@checkout`, `@orders`, `@promo`,
  `@returns`, `@admin`, `@admin-orders`, `@stock-alert`, `@loyalty`, `@auth`).
- Update the `TESTING.md` §2 note (drop "the 13 api specs still use title-based
  tags") once done.

---

## Definition of Done

- `--grep @<feature>` now selects the migrated **api** specs (verify e.g.
  `test:feature @loyalty` includes `tests/api/loyalty.api.spec.ts`).
- No spec re-implements the paid-order/address+cart recipe inline.
- `pnpm --filter @qa/tests test` (full suite) + `test:sanity` green; counts of
  `@smoke`/`@regression`/`@sanity` unchanged or higher.
- `test:update-snapshots` not required (no visual change).

## Status — ✅ Done

- **Seeding helpers** (`tests/support/seed.ts`): `seedPaidOrder(api, db, {
  token, priceCents?, stock?, qty? })` (the de-duped `placePaidOrder`),
  `withDefaultAddress(api, token)`, and `seedProduct(db, overrides)`. Adopted in
  **4 api specs** (order-returns, admin-orders, loyalty, order-cancel) and **3
  e2e specs** (order-returns, admin-orders, order-management); the local
  `placePaidOrder`/`earnViaCheckout` copies are deleted. The e2e specs that seed
  a *cart* and then drive the **UI** checkout (checkout, checkout-wizard,
  loyalty, promo-discovery, order-confirmation) were intentionally left — they
  don't place an API order, so `seedPaidOrder` doesn't apply.
- **Tag migration**: all title-based `@smoke`/`@regression` in `tests/api/*` →
  native `test('…', { tag: ['@<tier>', '@<feature>'] }, …)` — **96 tests across
  17 files** (promo-discovery was already native). `--grep @<feature>` now
  selects api specs (verified `@loyalty` → `api/loyalty.api.spec.ts`). Tiers
  preserved exactly, so `@smoke`/`@regression`/`@sanity` counts are unchanged.
  `TESTING.md` §2 note updated.
- **Client split**: deliberately **not** done — kept the single cohesive
  `ApiClient` and documented the decision (header note + this status). The spec
  sanctions this ("if the team prefers one file — document and stop here") and
  the DoD does not require it; recorded as a follow-up.
- Gates: `pnpm --filter @qa/tests typecheck|lint` green; chromium-desktop +
  visual full run **163 passed** (unchanged from baseline — behaviour-preserving,
  visual baselines untouched); `@sanity` green. No SUT changes.

## Follow-ups (out of scope)

- A `@fixtures` data-builder layer (Faker-backed) for orders/returns mirroring
  the existing `factories/`.
- Shard-aware parallel-safety audit of any spec relying on global DB state
  (e.g. admin order-list pagination).
