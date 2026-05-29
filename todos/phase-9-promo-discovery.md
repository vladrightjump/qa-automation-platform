# Phase 9 — Promo Discovery (coupons under test)

> **Type:** SUT feature extension. The goal is to give the storefront a richer,
> more realistic surface to test, exercising new state-machine and DB
> side-effect paths across the API, web, and test layers.

**Problem / motivation:** Promo codes already exist (`PromoCode`: `percentOff`
XOR `flatOffCents`, `active`, `expiresAt`) and are validated server-side at
checkout, but they are **undiscoverable** — a shopper must already know the code.
There is also no minimum-spend gating and no usage limit. That leaves obvious
e-commerce behaviours (deal discovery, "spend $X to unlock", single-use codes)
untested.

**Objective:** A public "available deals" surface plus minimum-spend and
redemption-limit rules, with full cross-layer test coverage.

---

## Build

**Data model** (`packages/db/prisma/schema.prisma`, `PromoCode`):
- `description String?` — shown on the deals panel.
- `minSpendCents Int @default(0)` — cart subtotal required before the code applies.
- `featured Boolean @default(false)` — discoverable via `GET /promo-codes`.
- `maxRedemptions Int?` (null = unlimited) + `timesRedeemed Int @default(0)`.
- Migration `…_add_promo_discovery_fields`; regenerate the client.
- Seed (`packages/db/src/seed-helpers.ts`): mark `WELCOME10`/`FREESHIP` featured;
  add `BIG20` (20% off, `minSpendCents` 5000, featured), `LIMITED5` (flat $5,
  `maxRedemptions` 1, featured), `HIDDEN15` (active, **not** featured).

**API** (`apps/api/src/orders`):
- `GET /promo-codes` (public `PromoController`, no auth) → featured + active +
  unexpired + not-exhausted codes; never exposes `timesRedeemed`/`maxRedemptions`.
- `previewPromo` enforces `minSpendCents` (400 below threshold) and
  `maxRedemptions` (400 when exhausted).
- `checkout` increments `timesRedeemed` and writes a `PROMO_REDEEMED` audit row
  inside the existing transaction.
- Contracts (`packages/contracts/src/index.ts`): `PromoCodeSchema` +
  `PromoCodeListSchema` (public shape), exported types.

**Web** (`apps/web/app/checkout/page.tsx`):
- A "🎁 Available deals" panel on the review step, fetched from
  `GET /promo-codes`, with one-click apply reusing `applyPromo`. Locked state
  when the cart is below a deal's minimum spend.
- Test ids: `promo-deals`, `promo-deal-<CODE>`, `promo-deal-apply-<CODE>`,
  `promo-deal-locked-<CODE>`.

**Tests** (tagged `@promo`; one `@sanity`):
- `tests/support/api-client.ts` → `listPromoCodes()`.
- `tests/api/promo-discovery.api.spec.ts` — discovery contract, min-spend
  rejection, redemption-limit exhaustion + `timesRedeemed`/audit ground truth.
- `tests/e2e/promo-discovery.e2e.spec.ts` — discover → apply → place order →
  assert `Order.discountCents`/`promoCode` + `PROMO_REDEEMED` (`@promo @sanity`);
  plus a below-min-spend "locked" case.
- `tests/pages/checkout.page.ts` — deals-panel accessors.

---

## Definition of Done

- `pnpm db:migrate && pnpm db:seed`, `pnpm build`, `pnpm typecheck`, `pnpm lint` all green.
- `pnpm --filter @qa/tests test:feature @promo` passes (API + e2e).
- `pnpm --filter @qa/tests test:sanity` includes the promo sanity test and passes.

## Status — DONE

Implemented on branch `feat/promo-discovery-and-sanity-suite`. Migration
`20260529172532_add_promo_discovery_fields` applied; 9 `@promo` tests green; the
`@sanity` gate covers 10 features (one per feature) including promo discovery.

---

## Follow-ups (out of scope)

- Discount **stacking** / tiered & bundle discounts; time-window flash sales.
- **Per-user** redemption caps (current `maxRedemptions` is global).
- Admin **promo CRUD** UI + spec.
- Migrate the 13 `tests/api/*.spec.ts` specs from title-based tags to native
  `tag: [...]` + feature tags, for one consistent tagging convention.
