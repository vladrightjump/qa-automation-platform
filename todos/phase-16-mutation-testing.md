# Phase 16 — Mutation testing (Stryker) + unit-test layer

> **Type:** Test-infra extension. Adds a Vitest-backed unit-test surface
> over a small set of pure helpers, then grades that surface with Stryker.
> A committed mutation-score budget fails CI on regression.

**Problem / motivation.** Phases 0–15 built four behavioural layers (API
contract → DB side-effects → UI flow + DB ground truth → perf budgets).
All of them validate the SUT. **None of them validate the tests
themselves.** A green suite proves the SUT does X *for the cases the
tests cover* — but says nothing about whether the assertions are tight
enough to catch a real change. A reviewer can soften an assertion or
delete a branch and the suite still passes.

Mutation testing closes that gap. Stryker mutates the SUT (e.g. `<` →
`<=`, deletes a branch) and re-runs a fast test suite against each
mutant. Mutants the suite *should* kill but doesn't become a
mutation-score regression that gates CI. The tests become the
deliverable that earns the merge.

**Locked invariants — what mutation testing in this repo means.**

- **Stryker targets only pure helpers in `packages/contracts/src/`**
  (and `packages/db/src/seed-helpers.ts`). Not the whole SUT. Mutants
  per run stay small, the verifier suite stays fast.
- **No behaviour change in services.** The extracted helpers are
  byte-for-byte equivalent to the inline arithmetic they replace. The
  Phase-14 "money math unchanged" invariant is preserved.
- **Mutation-score budget lives in code, not in a dashboard.**
  `tests/mutation/budget.json` records the floor; CI fails if the live
  score drops below it. Reviewers see the diff in the PR.
- **Vitest is the unit runner.** ESM-native, TS-first, matches the
  existing stack with the least config churn.
- **Unit tests live alongside the helpers they test** (`*.test.ts` next
  to `*.ts`), separate from the Playwright tests in `tests/`.

**Objective.** (1) Extract three small pure-math helpers from existing
NestJS services into `@qa/contracts`. (2) Stand up a Vitest unit-test
layer covering them + two existing pure helpers (`i18n.ts`,
`seed-helpers.ts`). (3) Wire Stryker over those files, commit a
`minScore` budget, and gate it in a nightly + path-filtered CI workflow.

---

## Build

### Contracts (`packages/contracts/src/`)

- New `promo-math.ts`:
  - `computeDiscount(subtotalCents: number, promo: { percentOff: number | null, flatOffCents: number | null }): { discountCents: number }`.
  - Same arithmetic + clamping currently in `apps/api/src/orders/promo.service.ts` lines 87–98.
- New `loyalty-math.ts`:
  - `LOYALTY_EARN_RATE = 0.05` (moved from the service).
  - `earnedPoints(chargedCents: number): number` — floor of `chargedCents * LOYALTY_EARN_RATE`.
  - `clampRedemption(requested: number, afterPromoCents: number): number` — `Math.min(requested, afterPromoCents)`.
- New `recommendations-math.ts`:
  - `MAX_RECOMMENDATIONS = 12`.
  - `SCORE = { collaborative, sameCategory, recentlyViewed }` — the existing scoring functions.
  - `compareRecommendations(a, b)` — the comparator used in the service's `.sort()` (score desc, ties broken by `product.id.localeCompare`).
- Re-export from `index.ts`.

### Services (call-site delegates only)

- `apps/api/src/orders/promo.service.ts` — replace the inline arithmetic with `computeDiscount(...)` from `@qa/contracts`.
- `apps/api/src/orders/loyalty.service.ts` — replace the inline arithmetic with `earnedPoints(...)` + `clampRedemption(...)`.
- `apps/api/src/recommendations/recommendations.service.ts` — import `SCORE` + `MAX_RECOMMENDATIONS` + `compareRecommendations` from `@qa/contracts`.

The services keep their public shape and behavior. The diff is `import`
lines and delegate calls.

### Unit-test infra

- `pnpm add -D vitest @vitest/coverage-v8` at the package level for
  `@qa/contracts` and `@qa/db`.
- `vitest.config.ts` per package: minimal config, json-summary coverage
  reporter so Stryker can read it.
- Scripts:
  - `packages/contracts/package.json`: `"test:unit": "vitest run"`,
    `"test:unit:watch": "vitest"`, `"coverage": "vitest run --coverage"`.
  - Same in `packages/db/package.json`.
- Root `package.json`: `"test:unit": "turbo run test:unit"`.

### Unit-test files (alongside source)

- `packages/contracts/src/promo-math.test.ts` — percent vs flat,
  min-spend gate boundary, clamp-to-total invariant.
- `packages/contracts/src/loyalty-math.test.ts` — earn rate floor at
  boundary values, integer outputs, clamp behavior.
- `packages/contracts/src/recommendations-math.test.ts` — SCORE outputs
  at boundary inputs, comparator stability (same score → id
  tiebreaker), per-kind monotonicity.
- `packages/contracts/src/i18n.test.ts` — `convertCents` USD passthrough
  + EUR rate at typical/boundary cents, `formatMoney` per locale.
- `packages/db/src/seed-helpers.test.ts` — `mulberry32` determinism
  (same seed → identical first N outputs), `pick` index distribution,
  `seedBulkProducts` ID format + price/stock range invariants (no DB
  needed; just the row-shape inputs).

### Stryker

- `pnpm add -Dw @stryker-mutator/core @stryker-mutator/vitest-runner @stryker-mutator/typescript-checker`.
- `stryker.config.json` at repo root:
  - `mutate`: the five files above (and only those).
  - `testRunner`: `"vitest"`.
  - `checkers`: `["typescript"]`.
  - `coverageAnalysis`: `"perTest"`.
  - `reporters`: `["progress", "clear-text", "html", "json"]`.
  - `htmlReporter.fileName`: `"reports/mutation/index.html"`.
  - `jsonReporter.fileName`: `"reports/mutation/mutation.json"`.
  - `thresholds`: `{ high: 90, low: 75, break: <committed-floor> }`.
- Root scripts:
  - `"mutate": "stryker run"`.
  - `"mutate:open": "stryker run && open reports/mutation/index.html"`.
- Budget: `tests/mutation/budget.json` →
  `{ "runner": "ci-ubuntu-2025-04", "minScore": <real-first-run-score - 2> }`.

### CI

- `.github/workflows/ci.yml`: new `unit` job (build → `pnpm test:unit`),
  parallel with `sanity`.
- `.github/workflows/mutation.yml`:
  - Triggers: nightly `30 4 * * *` UTC + `workflow_dispatch` + PRs
    touching `packages/contracts/src/**`, `packages/db/src/**`,
    `stryker.config.json`, or any `*.test.ts`.
  - Steps: install → build → `pnpm mutate` → upload
    `reports/mutation/` as 30-day artifact → fail with a clear message
    if `mutation.json.metrics.mutationScore < budget.json.minScore`.

### Docs

- New `tests/mutation/README.md` — what mutation testing is, how to
  read the HTML report, how to update the budget, locked invariants
  above. Mirrors the structure of `tests/perf/README.md`.
- `ARCHITECTURE.md` §7 file map — add rows for `tests/mutation/`, the
  three new math modules, and `stryker.config.json`.
- `README.md` three-layer table → grow a fifth row "Mutation score"
  pointing at `tests/mutation/README.md`.
- `tests/TESTING.md` → short "Mutation testing" paragraph linking out.

---

## Definition of Done

- `pnpm build && pnpm typecheck && pnpm lint` all green.
- `pnpm --filter @qa/tests test:feature @promo`, `… @loyalty`,
  `… @recommendations` still green after 16a (parity with pre-refactor).
- `pnpm --filter @qa/tests test:sanity` still green.
- `pnpm test:unit` green; line coverage on the five mutated files ≥ 95%.
- `pnpm mutate` finishes in ≤ 60s locally and achieves a mutation score
  at least as high as the committed `minScore`.
- Smoke check: locally weakening one assertion in a unit test makes
  `pnpm mutate` exit non-zero with the score < `minScore` diff in the
  output. Revert.
- `.github/workflows/mutation.yml` runs nightly and on
  `workflow_dispatch`, uploads the HTML + JSON report as an artifact.
- README test table grows a "Mutation score" row; `ARCHITECTURE.md` §7
  gains entries for `tests/mutation/`, the three math modules, and
  `stryker.config.json`. `tests/TESTING.md` gains the mutation-testing
  paragraph.
- New `tests/mutation/README.md` documents: how to run locally, how the
  score is computed, how to update the budget, and the locked
  invariants above.

## Sub-phases (suggested execution order; each ships independently)

1. **16a — extract pure math helpers** — refactor only, no behaviour
   change. `@qa/contracts` grows three new modules; three services
   delegate to them. Smallest blast radius.
2. **16b — Vitest unit-test layer** — Vitest config + scripts +
   `*.test.ts` next to each helper + `unit` CI job.
3. **16c — Stryker + budget + CI workflow** — Stryker config, committed
   `minScore`, new `mutation.yml`, docs.

Each sub-phase has its own Definition-of-Done subset; collapse only if a
single PR is preferable.

## Follow-ups (out of scope)

- **Mutation testing the NestJS services.** Would require Prisma +
  transaction mocking; would slow Stryker runs by ~10×.
- **Mutation testing the React storefront.** Stryker's React story is
  weaker; visual specs already catch most UI regressions.
- **Property-based testing (fast-check).** Natural pairing with
  mutation testing, but distinct enough to be its own phase.
- **Raw line-coverage gate in CI.** Stryker subsumes the strongest case
  for coverage; raw % is noisy.

## Status — 🟡 In progress

- **16a — extract pure math helpers** — pending.
- **16b — Vitest unit-test layer** — pending.
- **16c — Stryker + budget + CI workflow** — pending.
