# Tasks — short-form index of the six phases

> Each phase is a small, context-bounded chunk in its own file. Pick
> any one up cold without re-reading the [summary](./research-stack-improvements.md)
> — every phase file restates its own scope, files, acceptance, and
> scope-guard.
>
> Phases A + B are pure reorganization (no new tests, no new tools).
> C + D are signature specs within the existing stack. E + F add the
> only new dependencies (`vitest`, `@testing-library/react`,
> `vitest-mock-extended`) and complete the pyramid base + mutation
> coverage.
>
> Naming convention mirrors the existing `phase-N-*.md` build plan.

---

## Phase A — Kind-tag taxonomy expansion

**File.** [`phase-A-tag-taxonomy.md`](./phase-A-tag-taxonomy.md)
**Adds.** 7 kind tags: `@negative`, `@edge`, `@boundary`, `@empty`,
`@security`, `@race`, `@slow`.
**Changes.** `tests/TESTING.md`, `tests/package.json` scripts,
`.github/workflows/ci.yml` (1 new fast PR job).
**No new tests. No new tools.**

---

## Phase B — Retag existing 57 specs

**File.** [`phase-B-retag-existing.md`](./phase-B-retag-existing.md)
**Depends on.** Phase A.
**Adds.** Kind-tag annotations to existing tests that already test
those dimensions.
**Acceptance.** `pnpm test:negative` ≥ 30, `:edge` ≥ 15, `:security`
≥ 10, `:boundary` ≥ 10.
**No new tests. No new tools.**

---

## Phase C — Six signature specs (within existing stack)

**File.** [`phase-C-signature-specs.md`](./phase-C-signature-specs.md)
**Adds.**
1. `tests/api/security.api.spec.ts` — RBAC denial matrix (`describe.each`).
2. `tests/api/jwt-tamper.api.spec.ts` — token integrity.
3. `tests/api/race-conditions.db.spec.ts` — parallel checkout /
   cart / promo (replaces k6 within stack).
4. `tests/api/fault-injection.db.spec.ts` — transaction rollback under
   simulated failure (replaces Toxiproxy within stack); needs a tiny
   `/test/inject-failure?at=…` seam in the API.
5. `tests/e2e/cross-feature-matrix.e2e.spec.ts` — locale × region ×
   payment matrix.
6. `tests/e2e/empty-states.e2e.spec.ts` — empty-state showcase.

**Acceptance.** Six new files, ~60–80 new tests, all reuse existing
fixtures.
**No new tools.**

---

## Phase D — Three edge/boundary specs

**File.** [`phase-D-edge-boundary.md`](./phase-D-edge-boundary.md)
**Adds.**
- `tests/api/promo.edge.spec.ts`
- `tests/api/loyalty.edge.spec.ts`
- `tests/api/checkout.edge.spec.ts`

**Acceptance.** ~30 new tests across three files. Each surgically
exercises boundary inputs (one cent over/under, last redemption slot,
expiry second, quantity 0 / 1 / MAX_SAFE_INTEGER, unicode fields).
**No new tools.**

---

## Phase E — Pyramid base (Vitest only, narrowly scoped)

**File.** [`phase-E-pyramid-base.md`](./phase-E-pyramid-base.md)
**Adds.**
- `apps/web` Vitest + RTL on **3 components only**: `lib/auth.tsx`,
  `lib/i18n.tsx`, `components/GeoBanner.tsx`.
- `apps/api` Vitest with `vitest-mock-extended` on **3 services only**:
  `orders.service`, `promo.service`, `geo.service`.

**Acceptance.** ≥ 80 % statement coverage on those 6 files. `pnpm
test:unit` (root) picks them up via turbo. New CI `unit` job in <10 s.
**New deps.** `vitest`, `@testing-library/react`,
`@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`
(for `apps/web`); `vitest`, `vitest-mock-extended` (for `apps/api`).

---

## Phase F — Expand Stryker mutate glob to services covered by Phase E

**File.** [`phase-F-mutation-services.md`](./phase-F-mutation-services.md)
**Depends on.** Phase E.
**Adds.** Three lines to `stryker.config.json` `mutate` array
(`orders.service.ts`, `promo.service.ts`, `geo.service.ts`).
Rebaselines `tests/mutation/budget.json`.
**Acceptance.** `pnpm mutate` runs <5 min; budget reflects the honest
first-clean-run score + 5 % buffer.
**No new tools.**

---

## Dependency graph

```
Phase A  ──►  Phase B  ──►  (gate is live in CI; portfolio reads "negative coverage exists")
                            │
                            ├──►  Phase C  (6 specs, independent of D, E, F)
                            ├──►  Phase D  (3 specs, independent of C, E, F)
                            └──►  Phase E  ──►  Phase F  (mutation needs verifier)
```

A + B can land in one afternoon (no new tests). C, D, E, F are each
small enough for one focused PR. F follows E. Everything else parallel.

---

## What is explicitly NOT in this index

Documented in [`research-stack-improvements.md §0` and `§3.7–3.16`](./research-stack-improvements.md):

- OpenAPI ↔ Zod alignment meta-test
- Prisma ↔ Zod enum diff meta-test
- k6 load testing (replaced by Phase C race-conditions spec within stack)
- Schemathesis OpenAPI fuzz
- testcontainers-postgres per worker (would break the singleton thesis)
- Playwright Component Testing (Vitest+RTL covers the same logic)
- OpenTelemetry span assertions
- Toxiproxy chaos (replaced by Phase C fault-injection spec within stack)
- Generated API client from OpenAPI
- Allure / ReportPortal reporter
- Chromatic / Argos visual diff service
- Pact cross-language consumer

If any becomes specifically valuable for a target role, revive as a
one-PR addition.
