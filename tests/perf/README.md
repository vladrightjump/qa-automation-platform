# Perf as a test layer

Phase 15d ships performance as a first-class assertion layer. A Lighthouse
audit + a Web Vitals capture run as a dedicated Playwright project
(`lighthouse-perf`), and a breach of any committed budget fails CI.

## Locked invariants

- **Budgets live in code, not in an external dashboard.** A regression
  past `tests/perf/budgets.json` fails the run. Reviewers see the diff in
  the PR.
- **Perf tests run against the same SUT, same DB, same seed** as every
  other suite. Only data volume changes (via `POST /test/bulk-seed-products`
  invoked from `perf/setup/perf-seed.setup.ts`).
- **Determinism over realism for assertions.** Budgets are sized for the
  GitHub Actions ubuntu-latest runner profile (recorded under `runner` in
  `budgets.json`). Local runs on faster hardware will show headroom; that
  is fine — only CI's verdict gates merging.
- **CLS is fixed at 0.1** (the Web Vitals "good" threshold) on every
  route. LCP and TBT vary per route.
- **INP is asserted via the `web-vitals` library, not Lighthouse.**
  Lighthouse's headless run can't reliably measure INP — we inject the
  `web-vitals` IIFE bundle into a scripted journey on `/` and read
  emitted values instead.

## Local run

```bash
pnpm --filter @qa/tests perf:lighthouse
# or:
pnpm --filter @qa/tests perf:all
```

The lighthouse-perf project:
1. Depends on `setup` → produces `.auth/user.json` / `.auth/admin.json`.
2. Depends on `perf-setup` → bulk-seeds the catalog deterministically
   (`PERF_BULK_SEED_COUNT=1000, PERF_BULK_SEED_RNG=42` by default).
3. Runs `*.perf.spec.ts` files with `--remote-debugging-port=9222` so
   `playwright-lighthouse` can attach.

## Files

| File | Purpose |
| --- | --- |
| `budgets.json` | Committed source of truth for per-route LCP/CLS/TBT |
| `lighthouse/routes.perf.spec.ts` | One Lighthouse audit per route |
| `web-vitals.perf.spec.ts` | RUM-style CLS/LCP/INP capture on a scripted `/` journey |
| `runner/seed.ts` | Hits `POST /test/bulk-seed-products`; called from `perf-seed.setup.ts` |
| `setup/perf-seed.setup.ts` | `perf-setup` project entry — runs `seed.ts` once before perf specs |

## Rebaselining

The runner profile is recorded in `budgets.json`. To raise a budget after
a deliberate change in the SUT, run `perf:lighthouse` locally three
times, take the worst LCP/TBT, round up to the nearest 50ms, and bump the
relevant entry in `budgets.json`. PRs that loosen a budget should explain
why in the description.

## CI

`.github/workflows/perf.yml` runs nightly (`0 4 * * *` UTC) and on PRs
that touch `apps/**`, `packages/**`, `tests/perf/**`, or the workflow
itself. It uploads the Playwright report + test results as 30-day
artifacts.

## Out of scope (phase 15e + follow-ups)

- k6 load scripts (`tests/perf/k6/`) — deferred (k6 install not yet
  available on every dev machine).
- PR-comment diff runner — deferred to 15e.
- Bundle-size budgets, OpenTelemetry tracing, real Redis — listed as
  follow-ups in `todos/phase-15-performance.md`.
