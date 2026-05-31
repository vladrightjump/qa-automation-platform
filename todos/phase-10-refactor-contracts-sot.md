# Phase 10 — Refactor: one source of truth for types

> **Type:** Behaviour-preserving refactor. No user-visible change, no new
> `data-testid`s. The existing suite (every testid + the `@sanity` gate) is the
> safety net — DoD is "green gates, no spec edits."

**Problem / motivation:** `apps/web/lib/api.ts` re-declares **33**
`interface`/`type`s (`Product`, `Order`, `OrderItem`, `Address`, `PromoCode`,
`Wishlist`, `Review`, `OrderReturn`, `LoyaltyTransaction`, …) that already exist
as Zod-inferred types in `@qa/contracts` (`packages/contracts/src/index.ts`),
the single source of truth the **test** client already consumes. The file even
carries a stale `// Phase 4 will replace them with the shared Zod schemas`
comment. Every feature added this session (returns, loyalty) forced editing the
*same* shape in two places — a proven drift hazard: the web type can silently
disagree with the API contract and nothing fails until runtime.

**Objective:** The web app consumes `@qa/contracts` as its type source. Inline
duplicates are deleted. Only genuinely web-local request shapes remain local,
and even those derive from contract types where possible.

---

## Build

**Web types** (`apps/web/lib/api.ts`):
- Replace each inline entity declaration with
  `import type { Product, Order, OrderItem, Address, PromoCode, PromoPreview, Wishlist, WishlistItem, Review, PagedProducts, PagedReviews, ReviewSummary, Cart, CartItem, OrderStatus, PaymentMethod, ProductCategory, ProductSort, User, Return as OrderReturn, ReturnStatus, LoyaltyTransaction, LoyaltyBalance, LoyaltyType, PagedOrders, StockAlert } from '@qa/contracts'`.
- Keep **web-only request inputs** local (`ListProductsQuery`, `CheckoutInput`,
  `AddressInput`, `AdminProductInput`) — but derive from contract types where it
  reduces drift (e.g. `type AddressInput = Omit<Address, 'id'|'userId'|'createdAt'|'updatedAt'>`).
- Re-export the contract types web modules currently import from `@/lib/api`
  (`export type { Product, Order, … }`) so call-site imports don't churn.
- Delete the stale Phase-4 comment.

**Dependency:** confirm `apps/web/package.json` has `@qa/contracts` as a
`workspace:*` dep (add if missing); it is already a workspace package consumed
by `@qa/tests`.

**Stretch (optional, can be a follow-up):** give the web `request()` helper a
dev-only `schema?: ZodType` param that `.parse()`s the response (parity with the
Zod-validating test client in `tests/support/api-client.ts`), so contract drift
surfaces in the browser during development too.

---

## Definition of Done

- No `interface`/`type` in `apps/web/lib/api.ts` restates a `@qa/contracts`
  shape; the file imports them instead.
- `pnpm build`, `pnpm typecheck`, `pnpm lint` all green.
- `pnpm --filter @qa/tests test:sanity` green; storefront e2e unchanged (no spec
  or `data-testid` edits).

## Status — ✅ Done

- `apps/web/lib/api.ts` now `import type`s all 28 entity types from
  `@qa/contracts` and re-exports them (plus `Return as OrderReturn`) so call
  sites are unchanged. The stale Phase-4 comment is gone. Only web-local request
  shapes remain local: `ListProductsQuery`, `AddressInput`, `CheckoutInput`,
  `AdminProductInput`, `ReviewSort` (and the `ApiError` class). `AddressInput`
  was kept as a hand-written interface rather than `Omit<Address, …>` because
  the contract makes `country`/`isDefault`/`line2` required, which would have
  broken the existing `EMPTY_ADDRESS` literal in `checkout/page.tsx`.
- `apps/web/package.json` gained `"@qa/contracts": "workspace:*"`.
- Stretch goal (dev-time response `.parse()`) intentionally deferred to keep the
  change type-only and runtime-identical; left as a follow-up.
- Gates: `pnpm -r typecheck`, `pnpm -r lint`, `pnpm --filter @qa/web build` all
  green. `test:sanity` green except 2 `chromium-mobile` specs (`nav-orders` /
  Admin link are `hidden sm:inline-flex` on mobile) — **verified pre-existing**:
  identical failures on the unmodified baseline, so no regression from this
  refactor.

## Follow-ups (out of scope)

- Generate an OpenAPI client from the NestJS Swagger doc and diff it against
  `@qa/contracts` in CI to catch server/contract drift automatically.
- Apply the same dev-time response validation to the admin pages.
