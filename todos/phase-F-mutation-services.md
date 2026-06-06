# Phase F — Expand Stryker mutate glob to services covered by Phase E

> Three lines added to `stryker.config.json`. One rebaseline of the
> mutation budget. That's the whole phase.
>
> Depends on Phase E (Stryker needs the new Vitest unit suite as its
> verifier). Time-box: one short PR.

---

## Why

Stryker today mutates 5 pure files: `promo-math.ts`, `loyalty-math.ts`,
`recommendations-math.ts`, `i18n.ts`, `bulk-seed-rng.ts`. The config
explicitly documents why services were left out:

> Mutating service code would require Prisma + transaction mocking and
> is captured as a follow-up.

Phase E adds the Vitest unit suite with mocked Prisma. That's the
"follow-up" Stryker was waiting for. Adding service files to the
`mutate` glob now measures the *real* test quality on the
transactional core, not just on pure helpers.

This is also the single highest-signal portfolio addition for a QA
interview targeting senior / quality-engineer roles: "my mutation
testing covers the same services that hold the transactional logic,
not just the math helpers".

---

## What

### F.1 Extend `stryker.config.json` `mutate`

Add three lines:

```json
"mutate": [
  "packages/contracts/src/promo-math.ts",
  "packages/contracts/src/loyalty-math.ts",
  "packages/contracts/src/recommendations-math.ts",
  "packages/contracts/src/i18n.ts",
  "packages/db/src/bulk-seed-rng.ts",
  "apps/api/src/orders/orders.service.ts",
  "apps/api/src/promo/promo.service.ts",
  "apps/api/src/geo/geo.service.ts"
]
```

### F.2 Rebaseline `tests/mutation/budget.json`

Run `pnpm mutate` once cleanly. Read the actual score from
`reports/mutation/mutation.json`. Set the new break threshold to
**(actual score − 5 %)** so the gate is honest and not hopeful.

If the initial score is genuinely low (<80 %), do **not** set the gate
at 95 % "for ambition". Set it at the real number. Either:
- accept the lower gate and document the gap in
  `tests/mutation/README.md` as a follow-up, **or**
- write additional Vitest tests (in Phase E's files) to close the
  surviving mutants until the score honestly rises.

Honesty matters more than the headline number — interviewers ask
"how did you set that threshold?" and "we measured it and it's the
actual score minus a 5 % buffer" is the answer that lands.

### F.3 Update `tests/mutation/README.md`

Document:
- What's now in scope (the three services).
- What's still out of scope and why (controllers — DI shells; CRUD
  services — no logic; `cart.service` — could be added later if
  Vitest coverage extended).
- How to interpret a regression on a service mutant vs a math mutant.

---

## Acceptance

- `pnpm mutate` runs locally in <5 min, uses Phase E's Vitest suite as
  the verifier.
- `tests/mutation/budget.json` `break` value reflects the honest first-
  clean-run score minus 5 %.
- The CI `mutation` workflow passes with the new gate.
- A deliberately weakened assertion in one of Phase E's tests (e.g.,
  loosen an `expect(total).toBe(N)` to `expect(total).toBeGreaterThan(0)`)
  drops the score below the gate and **fails** CI.
- `tests/mutation/README.md` lists the three new service files in the
  "in scope" section.

## Scope guard

- **Three services only.** Do not add `cart.service.ts`,
  `auth.service.ts`, or any controller to the glob unless Phase E
  Vitest coverage is extended to them too. A mutant on uncovered code
  produces a noisy false signal.
- **Honest threshold.** Do not set the break threshold higher than the
  real measured score. Portfolio cred comes from real numbers.
- **No tools beyond what Stryker + Vitest already provide.**
- Keep `coverageAnalysis: "perTest"` — it's what keeps the run under a
  minute on a laptop.

## Dependencies

Phase E must land first. Stryker uses the Vitest suite as its verifier
runner — without unit tests on the three services, mutating them just
produces all-surviving mutants and a meaningless score.

## Out of scope (deliberately)

- Mutating controllers / DTOs — no logic to mutate.
- Mutating Page Objects or Playwright fixtures — Stryker doesn't
  meaningfully mutate test code.
- Setting up incremental mode (`"incremental": true`) — keep the
  config flat until it actually hurts performance.
- A second mutation framework (e.g., Mutiny.js) — Stryker is enough.

## Status — ✅ Built (`140eb56`)

`stryker.config.json` `mutate` extended from 5 to 8 files: `apps/api/src/orders/orders.service.ts`, `apps/api/src/orders/promo.service.ts`, `apps/api/src/geo/geo.service.ts` joined the five pure helpers. The root `vitest.config.ts` `include` was extended with `apps/api/src/**/*.test.ts` so Stryker's verifier finds the Phase E suites (Phase doc didn't anticipate this — root vitest was previously contracts + db only). The three Phase E test files grew by ~10 assertions to close obvious gaps (race-on-stock branch, `list()` method coverage, audit-log entity/metadata, Prisma call-arg shape, two geo nearest-region boundary cases) — test count 36 → 46.

**Honest score** of 87.78 % measured across 311 mutants in 14 seconds; pure helpers stay at 100 %, services land at 84-87 % each. `tests/mutation/budget.json#minScore` and `stryker.config.json#thresholds.break` both set to **82** = `floor(score − 5)` per the phase doc rule. `tests/mutation/README.md` refreshed with the new scope, file table, and current-score line.

The remaining mutant survivors on the services are mostly Prisma call-argument `ObjectLiteral` mutations (the runtime never observes the mutated shape with the deep mock in place) — those are closed end-to-end by the Playwright API suite, not by unit-layer assertions. Documented in `budget.json.notes`.
