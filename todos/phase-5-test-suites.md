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
