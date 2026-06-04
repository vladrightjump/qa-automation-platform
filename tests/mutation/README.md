# Mutation testing as a test layer

Phase 16 ships mutation testing as the project's fourth testing layer.
Stryker mutates the SUT's source (e.g. `<` → `<=`, deletes a branch) and
re-runs the Vitest unit suite against each mutant. A mutant the suite
*should* kill but doesn't lowers the mutation score; falling below the
committed floor fails CI.

## Locked invariants

- **Stryker targets only pure helpers** in `packages/contracts/src/`
  (and `packages/db/src/bulk-seed-rng.ts`). Mutating NestJS services
  would require Prisma + transaction mocking and is a captured
  follow-up in `todos/phase-16-mutation-testing.md`.
- **The committed `minScore`** in [`budget.json`](./budget.json) is the
  CI floor. Stryker's own `break` threshold mirrors it
  (`stryker.config.json`). Two checks, one number.
- **Equivalent mutants are flagged in code**, not in a sidecar file.
  Lines that produce observably-identical output under mutation carry
  a `// Stryker disable next-line <mutator>` comment with a short
  reason. Reviewers see the suppression in the diff.
- **Sample data is exempt.** The adjective/noun arrays in
  `bulk-seed-rng.ts` carry a `// Stryker disable all` block — mutating
  `"lamp"` to `""` doesn't catch a real bug.
- **Vitest is the verifier.** The same suite that gates `pnpm test:unit`
  is the suite Stryker runs against each mutant — no separate harness.

## Local run

```bash
pnpm mutate         # exits non-zero if score < budget.json.minScore
pnpm mutate:open    # also opens reports/mutation/index.html
```

Typical local run on this machine: ~5 seconds for 57 mutants across 5
files.

## Reading the report

The HTML report at `reports/mutation/index.html` shows each file with a
per-line mutation map: green = killed mutant, red = surviving mutant
(with the source diff inline). Click a line to see what the mutated code
looked like and which test should have killed it.

The JSON sidecar `reports/mutation/mutation.json` is what CI parses to
enforce the budget.

## Updating the budget

The current score is **100%** across all five mutation-tested files,
with the budget pinned at **95%** (five points of headroom for routine
refactors). To raise it after a real improvement:

1. Run `pnpm mutate` locally and confirm the new score.
2. Bump `tests/mutation/budget.json#minScore` *and*
   `stryker.config.json#thresholds.break` in the same PR.

To lower it, explain why in the PR description — the budget is the
test-quality contract.

## CI

[`.github/workflows/mutation.yml`](../../.github/workflows/mutation.yml)
runs nightly (04:30 UTC, 30 min after the perf workflow) and on PRs that
touch the mutated source, the Stryker config, the budget, or the Vitest
configs. It runs `pnpm mutate`, double-checks the score against
`budget.json`, and uploads the HTML + JSON report as a 30-day artifact.

## Files

| File | Purpose |
| --- | --- |
| [`budget.json`](./budget.json) | Committed `minScore` — the CI floor |
| [`../../stryker.config.json`](../../stryker.config.json) | Mutator config, target files, break threshold |
| [`../../vitest.config.ts`](../../vitest.config.ts) | Root Vitest config the Stryker runner uses |
| `packages/contracts/src/{promo,loyalty,recommendations}-math.ts` | Extracted pure helpers (phase 16a) |
| `packages/contracts/src/i18n.ts` | FX + format helpers |
| `packages/db/src/bulk-seed-rng.ts` | Pure RNG + bulk-product row builder |
| `packages/*/src/**/*.test.ts` | The Vitest verifier suite |

## Property-based companion (phase 17)

Each mutated source file also has a `*.prop.test.ts` companion that uses
fast-check to assert invariants over ~100 random inputs per property:

| Source | Property file |
| --- | --- |
| `packages/contracts/src/promo-math.ts` | `promo-math.prop.test.ts` |
| `packages/contracts/src/loyalty-math.ts` | `loyalty-math.prop.test.ts` |
| `packages/contracts/src/recommendations-math.ts` | `recommendations-math.prop.test.ts` |
| `packages/contracts/src/i18n.ts` | `i18n.prop.test.ts` |
| `packages/db/src/bulk-seed-rng.ts` | `bulk-seed-rng.prop.test.ts` |

Property tests run under the same `pnpm test:unit` command and act as
additional Stryker verifiers. fast-check shrinks any failing case to a
minimal counterexample — see
[`todos/phase-17-property-testing.md`](../../todos/phase-17-property-testing.md)
for the locked invariants and one real example where a property exposed
a bug in its own assertion on the first run.

## Out of scope

- Mutation testing the NestJS services (Prisma + transaction mocking).
- Mutation testing the React storefront.
- Generative SUT-level testing (fast-check journeys for Playwright).
- Raw line-coverage gates in CI — Stryker subsumes the strongest case
  for coverage.
