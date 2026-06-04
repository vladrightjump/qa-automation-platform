# Phase 17 — Property-based testing (fast-check)

> **Type:** Test-infra extension. Adds a fast-check property layer
> alongside the existing example-based Vitest suite for the five pure
> helpers Stryker already mutates.

**Problem / motivation.** Phase 16 graded the example-based Vitest suite
with Stryker and reached 100% mutation score on the five pure helpers.
But example tests only probe the cases the author imagined: a `<= 0`
boundary, a few specific subtotals, the seeded promo codes. A subtle
invariant violation outside that hand-picked set still slips through —
and Stryker can't surface what example tests don't cover in the first
place.

Property-based testing fills the gap. fast-check generates ~100 random
inputs per property and asserts an invariant holds across all of them.
When it finds a counterexample it shrinks to the minimal failing case.

**Locked invariants — what property testing in this repo means.**

- **Property tests live next to example tests** as `*.prop.test.ts`.
  Same `describe`/`it` shape, same Vitest runner, same imports.
- **One property file per mutated source file** — five files, file for
  file with the existing `*.test.ts` set.
- **fast-check defaults stay** (100 runs per property). If a property is
  flaky, it's wrong — fix the invariant or the generator. Never bump
  seeds and never permanently skip a property.
- **Shrinking-friendly invariants.** Properties assert *non-trivial
  relations* (e.g. `discount ≤ subtotal`), not tautologies.
- **No SUT behaviour change.** The Stryker `mutate` list is unchanged.

**Objective.** Ship five `*.prop.test.ts` files (one per mutated helper),
extend the Vitest include globs, and confirm the existing 100% mutation
score holds with the wider verifier suite.

---

## Build

### Tooling

- Add `fast-check` at the **root** (`package.json#devDependencies`).
- Widen Vitest `include` globs to pick up the new file suffix:
  - `packages/contracts/vitest.config.ts`:
    `['src/**/*.test.ts', 'src/**/*.prop.test.ts']`
  - `packages/db/vitest.config.ts`: same widening.
  - Root `vitest.config.ts`: add
    `'packages/contracts/src/**/*.prop.test.ts'` and
    `'packages/db/src/**/*.prop.test.ts'`.
- Stryker config unchanged. Its `mutate` list targets source files; the
  Vitest runner picks up whatever the include glob matches.

### Property files

| File | Properties (one `it` each) |
| --- | --- |
| `packages/contracts/src/promo-math.prop.test.ts` | percent-off discount in `[0, subtotal]`; matches the floor formula; flat-off equals `min(subtotal, flat)`; percent precedence; null + null → 0 |
| `packages/contracts/src/loyalty-math.prop.test.ts` | `earnedPoints` returns the floor formula; non-positive input → 0; monotonic; `clampRedemption` in `[0, min(req, ceiling)]`; positive request inside the order returns the request; nonpositive on either axis → 0; monotonic in afterPromoCents |
| `packages/contracts/src/recommendations-math.prop.test.ts` | antisymmetry; reflexivity; transitivity; `[..items].sort` is ordered by score desc then `localeCompare` asc; SCORE per-kind monotonicity; rank-0 ordering across kinds |
| `packages/contracts/src/i18n.prop.test.ts` | USD identity; EUR roundtrip within ±1¢ of the committed rate; zero → zero; output is an integer; `formatMoney` total; locale → expected currency symbol |
| `packages/db/src/bulk-seed-rng.prop.test.ts` | `mulberry32` output in `[0, 1)` for any seed × first 32 calls; determinism; `pick` always returns an array element; row count matches `count`; IDs unique + template; price/stock in range; category in canonical four; idempotence |

### Generators — local, no shared helpers

Each file declares its own arbitraries inline. Surface is small enough
that a shared `arbitraries.ts` would be premature.

### Docs

- `tests/mutation/README.md` — drop "fast-check" from the *Out of scope*
  list and add a "Property-based companion" section with a source →
  prop-file table.
- `tests/TESTING.md` — extend the "Mutation testing as a layer"
  paragraph with a sentence on the property companion.

---

## Definition of Done

- `pnpm build`, `pnpm typecheck`, `pnpm lint` all green.
- `pnpm test:unit` — green; new `*.prop.test.ts` files appear in the
  output. Total count = existing example tests + new property tests.
- `pnpm mutate` — green; score ≥ 95 (committed `minScore`). Score
  expected to stay at 100% on the same source files.
- A real counterexample is documented (see Status block).
- `tests/mutation/README.md` + `tests/TESTING.md` updated.

## Follow-ups (out of scope)

- **Generative SUT-level testing** (fast-check journeys for Playwright).
  Requires model-based testing infra; worth its own phase if pursued.
- **Custom shrink strategies** or biased generators. Not needed at the
  current surface size.
- **Property tests over Nest services / React components.** Mocking
  heavy, low value vs the pure-helper layer.

## Status — ✅ Built

- **17 — fast-check property layer** — ✅ Built. Added `fast-check`
  devDep at the root; widened the Vitest include globs in three config
  files. Five new `*.prop.test.ts` files alongside the existing
  `*.test.ts` ones, file for file. Property tests join the Vitest suite
  as Stryker verifiers — `pnpm mutate` re-ran with the same 100%
  mutation score (57 mutants, 0 survivors) across all five files, with
  the budget still pinned at `minScore=95`.

  **Real counterexample fast-check surfaced on the first run** — the
  sort-order property I'd written asserted `a.product.id > b.product.id`
  (raw lexical), but `compareRecommendations` ties by `localeCompare`.
  fast-check shrunk a 20-item generated array down to two items with
  identical scores and IDs `"["` and `"/"` (ASCII 91 and 47 respectively
  — locale collation rules can put punctuation in a different order
  than raw codepoint comparison). Property reauthored to mirror the
  comparator's `localeCompare` tie-break; documented inline at the
  failing site so reviewers see the lesson. Exactly the kind of subtle
  drift example-based tests would never have surfaced.
