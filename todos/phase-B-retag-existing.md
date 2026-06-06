# Phase B — Retag existing 57 specs

> One-pass annotation of the existing suite with the kind tags defined
> in Phase A. **No new tests written.** ~150 existing tests gain at
> least one new scenario-dimension tag.
>
> Time-box: one afternoon.

---

## Why

After Phase A, the rulebook says `@negative` / `@edge` / `@security` /
`@boundary` / `@empty` exist. Until specs are actually annotated, the
interview prompt "show me your negative-path coverage" still produces
zero hits on `grep @negative`. This phase closes that loop.

The platform already tests these dimensions in 43 of 57 files. Phase B
is about *surfacing* them, not adding them.

---

## What

A targeted re-tag pass through the spec list. For each spec file,
identify tests that exemplify a scenario dimension and append the
matching kind tag to the existing `tag: [...]` array.

### Mapping (representative — not exhaustive)

| Spec file | Tests to retag → new kind tag |
|---|---|
| `tests/api/auth.api.spec.ts` | 401 / 422 paths → `@negative @security`; expired-token tests → `@security` |
| `tests/api/auth.db.spec.ts` | Cross-user lookup attempts → `@security` |
| `tests/api/admin-orders.api.spec.ts` | USER hitting admin endpoint → `@security @negative` |
| `tests/api/admin-products.api.spec.ts` | Same; non-admin CRUD → `@security @negative` |
| `tests/api/addresses.api.spec.ts` | User A patches user B's address → `@security` |
| `tests/api/cart.api.spec.ts` | quantity=0, remove-not-in-cart → `@negative @edge` |
| `tests/api/cart-polish.api.spec.ts` | max-int quantity, reorder of non-existent → `@edge @negative` |
| `tests/api/checkout-wizard.api.spec.ts` | minSpend exact / off-by-one → `@boundary`; expired promo → `@boundary @negative`; cap → `@boundary` |
| `tests/api/checkout.db.spec.ts` | Rollback case (mid-flight stock change) → `@negative` (still also @sanity) |
| `tests/api/geo.api.spec.ts` | lat/lng out-of-range → `@edge @negative`; missing params → `@negative` |
| `tests/api/loyalty.api.spec.ts` | Redemption past balance → `@boundary @negative` |
| `tests/api/order-cancel.api.spec.ts` | Cancel-of-FULFILLED → `@negative`; cancel-already-cancelled → `@negative` |
| `tests/api/order-returns.api.spec.ts` | Duplicate return → `@negative`; non-owner request → `@security` |
| `tests/api/promo-discovery.api.spec.ts` | Expired listed → `@boundary` (boundary on `expiresAt`) |
| `tests/api/reviews.api.spec.ts` | Duplicate review → `@negative`; rating out of range → `@edge @negative`; non-author delete → `@security` |
| `tests/api/search.api.spec.ts` | Empty q → `@edge`; sql-injection-y inputs → `@security @edge` |
| `tests/api/stock-alerts.api.spec.ts` | Subscribe on in-stock → `@negative`; duplicate subscribe → `@negative` |
| `tests/api/suggestions.api.spec.ts` | Empty q, limit boundary → `@edge` |
| `tests/api/wishlist.api.spec.ts` | Duplicate add → `@negative` |
| `tests/e2e/negative.e2e.spec.ts` | **All tests** → `@negative` (this is the one already named for it) |
| `tests/e2e/network-mocking.e2e.spec.ts` | Keep `@network`; failure-flavored tests also get `@negative` |
| `tests/e2e/addresses.e2e.spec.ts` | Empty saved-addresses state → `@empty` |
| `tests/e2e/order-management.e2e.spec.ts` | No-orders state → `@empty` |
| `tests/e2e/wishlist.e2e.spec.ts` | Fresh wishlist empty-state → `@empty` |
| `tests/e2e/recently-viewed.e2e.spec.ts` | No-history state → `@empty` |
| `tests/e2e/admin.e2e.spec.ts` | Non-admin redirected from `/admin` → `@security` |
| `tests/e2e/a11y.e2e.spec.ts` | Keep `@a11y`; no scenario tag added |
| `tests/e2e/quick-view.e2e.spec.ts` | Out-of-stock add-button disabled → `@boundary @edge` |
| `tests/e2e/responsive.e2e.spec.ts` | Keep `@tablet` / `@mobile`; no scenario tag added |

*Use this as the seed list and let the actual file contents drive the
final mapping.*

---

## Files to change

- All 57 `tests/**/*.spec.ts` files that match the mapping above.
  Append kind tag(s) to the existing `tag: [...]` array — do not
  remove or rename any tag.
- No source code edits. No fixture changes. No POM changes.

### Edit pattern (per test)

```ts
// before
test('rejects expired token', { tag: ['@regression', '@auth'] }, async ({ … }) => { … });

// after
test('rejects expired token', { tag: ['@regression', '@auth', '@security', '@negative'] }, async ({ … }) => { … });
```

---

## Acceptance

- `pnpm --filter @qa/tests test:negative` → ≥ **30** matched tests.
- `pnpm --filter @qa/tests test:edge` → ≥ **15**.
- `pnpm --filter @qa/tests test:security` → ≥ **10**.
- `pnpm --filter @qa/tests test:boundary` → ≥ **10**.
- `pnpm --filter @qa/tests test:empty` → ≥ **5**.
- Existing `pnpm test:smoke`, `test:sanity`, `test:regression`,
  `test:a11y` counts **unchanged**.
- Full suite still green: `pnpm --filter @qa/tests test`.

## Scope guard

- **No new tests.** Only kind-tag additions to existing tests.
- **Do not** remove a `@regression` / `@smoke` / `@sanity` tier tag.
  Scenario-dimension tags are additive.
- **At most one** of `@negative` / `@edge` / `@boundary` / `@security` /
  `@race` / `@empty` per test (per Phase A mapping rule). If a test
  *truly* spans two, pick the dominant.
- **Do not** retag `@a11y` or `@perf` specs — they already have
  dedicated kinds.
- **Do not** alter feature tags (`@auth`, `@cart`, …) in this pass.

## Dependencies

Phase A must land first (tag definitions in `tests/TESTING.md`).

## Out of scope (deliberately)

- Rewriting test bodies — even when a test could be sharper, leave it.
- Splitting one test into two — even when a test does multiple things.
  Those belong in Phase C / D.
- Removing duplicate or stale tests — separate cleanup.

## Status — ✅ Built

All pre-existing specs retagged in one mechanical pass. As of `main` HEAD: 38 `@negative`, 32 `@edge`, 28 `@boundary`, 14 `@empty`, 27 `@security` usages across the 66 spec files (some additions came later from Phase C/D). `pnpm test:negative` / `:edge` / `:boundary` / `:empty` / `:security` now return non-empty lists. No test bodies were altered, no specs were split or removed.
