# Phase 12 — Refactor: decompose OrdersService

> **Type:** Behaviour-preserving refactor. The HTTP surface, status codes,
> response shapes, and **every AuditLog `action` string** stay byte-identical —
> the API/DB specs assert on them and must pass unchanged.

**Problem / motivation:** `apps/api/src/orders/orders.service.ts` has grown to
**396 lines / 9 methods** spanning four distinct concerns bolted on over four
features:
- promo discovery + validation (`listPromoCodes`, `previewPromo`,
  `computeDiscount`),
- checkout (stock check, address validation, transaction, audit),
- returns (`requestReturn`),
- loyalty (`loyaltyBalance`, `getLoyalty`, earn/redeem inside checkout).

Everything is one class, so checkout reaches into promo + loyalty internals and
the discount math isn't independently unit-testable.

**Objective:** Split into cohesive, injectable collaborators; `checkout`
becomes an orchestrator. No controller or route changes.

---

## Build

**New services** (under `apps/api/src/orders/`, registered in `OrdersModule`):
- `promo.service.ts` — `listPromoCodes()`, `previewPromo()`, and the pure
  `computeDiscount(promo, total)`.
- `loyalty.service.ts` — `loyaltyBalance(userId)`, `getLoyalty(userId)`, and
  `earn`/`redeem` helpers (the cents math + ledger-row builders).
- `returns.service.ts` — `requestReturn(userId, orderId, reason)` with the
  eligibility + single-open-return guards.

**`OrdersService`** keeps `checkout`, `list`, `get`, `cancel` and **orchestrates**
the collaborators inside the existing `prisma.$transaction` (inject
`PromoService`/`LoyaltyService`). The transaction boundary and the exact audit
rows are unchanged: `ORDER_PAID`, `PROMO_REDEEMED`, `ORDER_CANCELLED`,
`RETURN_REQUESTED`, `LOYALTY_EARNED`, `LOYALTY_REDEEMED`.

**Controllers** (`orders.controller.ts`, admin `admin-orders.*`) delegate to the
new services where natural (e.g. `GET /loyalty` → `LoyaltyService.getLoyalty`,
`POST /orders/:id/return` → `ReturnsService`), but routes/paths/guards are
untouched.

**Constants:** lift `LOYALTY_EARN_RATE` and audit-action strings into a small
`orders/constants.ts` so producers and (test) assertions share them.

---

## Definition of Done

- `OrdersService` no longer contains promo/loyalty/returns logic directly;
  collaborators are injected and unit-friendly.
- Identical routes, status codes, response bodies, and AuditLog `action` strings.
- `pnpm build`, `pnpm typecheck`, `pnpm lint` green.
- `pnpm --filter @qa/tests exec playwright test tests/api/{orders,checkout,promo-discovery,order-cancel,order-returns,loyalty,admin-orders}*.spec.ts` green **with no spec edits**; `@sanity` green.

## Status — ✅ Done

- **`orders/constants.ts`** — `LOYALTY_EARN_RATE` + an `AuditAction` map of the
  six action strings, shared by every producer.
- **`promo.service.ts`** — `PromoService`: `listPromoCodes()`, `previewPromo()`,
  the now-public pure `computeDiscount()`, and `recordRedemption(tx, …)` (the
  in-transaction `timesRedeemed` bump + `PROMO_REDEEMED` audit row).
- **`loyalty.service.ts`** — `LoyaltyService`: `loyaltyBalance()`,
  `getLoyalty()`, `prepareRedemption()` (balance re-validation + clamp, exact
  400 message preserved), pure `earnedPoints()`, and `recordRedeem`/`recordEarn`
  ledger+audit writers that take the checkout `tx`.
- **`returns.service.ts`** — `ReturnsService.requestReturn()` (injects
  `OrdersService` for the 404/ownership guard); eligibility + single-open-return
  guards unchanged.
- **`OrdersService`** now holds only `checkout`/`list`/`get`/`cancel` and
  orchestrates `PromoService`/`LoyaltyService` **inside the original
  `prisma.$transaction`** — same boundary, same `ORDER_PAID` metadata, same
  ordering of audit rows. Down from 396 lines / 9 methods.
- `OrdersModule` registers all four services; controllers delegate
  (`/promo-codes` + `/promo-codes/apply` → `PromoService`, `/loyalty` →
  `LoyaltyService`, `/orders/:id/return` → `ReturnsService`). Routes, guards,
  status codes, and response shapes are untouched. (The `loyalty()` handler was
  renamed `getLoyalty()` to avoid colliding with the injected `loyalty` member;
  the route path is decorator-driven and unchanged.)
- Gates: `pnpm --filter @qa/api typecheck|lint|build` green. The
  orders/checkout/promo/cancel/returns/loyalty/admin-orders specs — **37
  passed** (every AuditLog assertion + the transactional-rollback test) — and
  `@sanity` **16 passed**, no spec edits.

## Follow-ups (out of scope)

- Add Jest/Vitest **unit** tests for the now-pure `computeDiscount` and loyalty
  earn/redeem math (currently only covered through e2e/API).
- Consider a `CheckoutService` separate from order CRUD if checkout grows further.
