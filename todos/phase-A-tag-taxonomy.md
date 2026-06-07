# Phase A — Kind-tag taxonomy expansion

> Pure reorganization. No new tests. No new tools. Lands the foundation
> for Phase B (retagging existing specs) and Phases C–D (signature
> specs that need the tags to exist).
>
> Time-box: one afternoon.

---

## Why

The platform's tag matrix today has **6 kind tags**: `@smoke`,
`@regression`, `@sanity`, `@a11y`, `@mobile`, `@tablet`, `@network`.
The 22 feature tags select by area (`@cart`, `@admin`, …) but there is
no scenario-dimension axis.

Audit ground truth: 43 of 57 spec files touch negative-flavor words
(`invalid`, `rejects`, `401`, `empty`, `forbidden`…) — **and 0 tests
carry an explicit `@negative` / `@edge` / `@security` / `@race`
tag**. The coverage exists; the surface doesn't. An interviewer
running `grep @negative` finds nothing.

This phase defines the scenario-dimension axis so the next phase can
apply it.

---

## What

Add 7 new kind tags to the rulebook:

| Tag | Meaning | Example |
|---|---|---|
| `@negative` | Asserts a failure path: 4xx, validation error, blocked action. | `auth.api.spec.ts` — register with invalid email returns 422. |
| `@edge` | Boundary inputs that aren't strict business-rule numerics: max-length string, unicode, max-int, decimal precision. | `cart.api.spec.ts` — quantity=`Number.MAX_SAFE_INTEGER`. |
| `@empty` | Empty-state UI: no orders, no products, no wishlist, no reviews. | `e2e/wishlist.e2e.spec.ts` — fresh user sees empty-state copy. |
| `@boundary` | Numeric boundaries on **business rules**: promo cap, stock=0, expiry second, minSpend cents. | `checkout-wizard.api.spec.ts` — minSpend exact boundary. |
| `@security` | RBAC denial, token tampering, missing/expired auth, IDOR (cross-user access). | `addresses.api.spec.ts` — user A patches user B's address → 403. |
| `@race` | Concurrent / contended state: parallel checkout, double-submit, idempotency. | (created in Phase C) |
| `@slow` | Expensive end-to-end; excluded from PR `@smoke`, runs only on `main`. | (used by Phase C race-conditions spec) |

**Mapping rules (to be documented in `tests/TESTING.md`).**

- A test carries **at most one** scenario-dimension kind tag from
  `@negative`, `@edge`, `@boundary`, `@security`, `@race`, `@empty`.
  If two would apply, pick the dominant one (the one most likely to be
  searched for in code review).
- A scenario-dimension kind tag is **additive** to a tier tag
  (`@smoke` / `@regression` / `@sanity`) and a feature tag.
- `@slow` is independent — any test can carry it.

---

## Files to change

### `tests/TESTING.md`

- Extend §2 Tag taxonomy: add the 7 rows above to the Kind tag table.
- Add §2a "Mapping rules" subsection with the bullet list above.
- Add an example block per kind tag pointing at a real spec line.

### `tests/package.json`

Add scripts mirroring the existing `test:smoke` / `test:regression`
pattern:

```json
"test:negative": "playwright test --grep @negative",
"test:edge": "playwright test --grep @edge",
"test:boundary": "playwright test --grep @boundary",
"test:empty": "playwright test --grep @empty",
"test:security": "playwright test --grep @security",
"test:race": "playwright test --grep @race",
"test:slow": "playwright test --grep @slow"
```

### `.github/workflows/ci.yml`

Add **one** new fast PR-gating job that runs the `@security ∪ @race`
subset on every PR. High-signal, small (will be empty until Phase B/C
populate it — that's fine, the job is dormant until then).

```yaml
security-race:
  name: Security + race (fast)
  needs: build
  runs-on: ubuntu-latest
  services: [the same postgres service container ci uses today]
  steps:
    - ...same setup as the existing sanity job...
    - run: pnpm --filter @qa/tests exec playwright test --grep "@security|@race"
```

(Patterned on the existing `sanity` job — copy that job and change the
grep.)

---

## Acceptance

- `pnpm --filter @qa/tests test:negative` is a valid command and
  exits 0 (no matching tests yet is fine; Playwright treats it as no-op).
- `tests/TESTING.md` §2 contains all 7 new tag rows with one real
  example each. (Real examples can reference specs that will be
  retagged in Phase B; cite the file path.)
- New `security-race` job runs in CI (green; will be a no-op until
  Phase B / C populate matching tests).

## Scope guard

- **Do not** retag any specs in this phase. That is Phase B's job.
- **Do not** write new tests. That is Phase C / D's job.
- **Do not** rename any existing tag.
- **Do not** add `@negative` as a tier replacement for `@regression` —
  it is *additive*. A failing-path test is still part of regression.
- Keep the new CI job small. Do not also gate the full `@negative`
  suite on PR — that's regression-tier on `main`.

## Dependencies

None. Foundation phase.

## Out of scope (deliberately)

- Renaming or splitting any feature tag.
- Changing `@sanity`'s "one per feature" rule.
- Adding tag-validation lint rules (could be a later phase; not now).

## Status — ✅ Built

Seven scenario-dimension tags (`@negative` · `@edge` · `@boundary` · `@empty` · `@security` · `@race` · `@slow`) added to `tests/TESTING.md` §2 with mapping rules in §2a. Seven `pnpm test:*` scripts added to `tests/package.json` (`--pass-with-no-tests` for the dimensions that Phase A leaves empty until Phase B's retag lands). New CI job `Security + race (fast)` runs `@security|@race` on every PR (`.github/workflows/ci.yml`). No new spec content in this phase — pure organization.
