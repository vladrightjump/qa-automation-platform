# QA Automation Platform — Build Plan

This plan is split into focused files. **Reference** files hold the standing context (stack, architecture, how to run). **Phase** files are the ordered build units — execute one at a time.

> **How to drive the build.** Keep these files in the repo as the plan. Give the agent `overview.md` + the current `phase-N-*.md` (plus any reference file it needs), then say *"Execute Phase N."* The agent completes only that phase, satisfies its Definition of Done, stops at the checkpoint, and reports back before continuing. Do not let it run ahead.

## Progress

| Phase | Status |
|---|---|
| 0 — Scaffolding & tooling | ✅ Done (`0e8f761`) |
| 1 — Database layer | ✅ Done (uncommitted — Postgres 16 installed via Homebrew) |
| 2 — Backend API | ✅ Done (uncommitted — full flow verified end-to-end) |
| 3 — Frontend storefront | ✅ Done (uncommitted — `next build` + all routes serve the testid map) |
| 4 — Test foundation | ✅ Done (uncommitted — smoke spec exercising db + api + authedPage passes) |
| 5 — Test suites | ✅ Done (uncommitted — 32 specs green, @smoke 9 in 5.1s) |
| 6 — CI/CD | 🟡 Workflow authored + YAML-validated; **green-run DoD needs a push to GitHub** |
| 7 — Agentic + MCP (optional) | ✅ Done (uncommitted — Explorer→stubs path; `_generated/` excluded from CI) |
| 8 — Docs & polish | ✅ Done (uncommitted — portfolio README + `ARCHITECTURE.md`) |
| 9 — Promo discovery | ✅ Done (`feat/promo-discovery-and-sanity-suite`) |
| 10 — Refactor: contracts as source of truth | ✅ Done (uncommitted — web `import type`s from `@qa/contracts`; 33 dupes deleted) |
| 11 — Refactor: web UI primitives + hooks | ✅ Done (uncommitted — product-visual + useRequireAuth; Button adopted as a no-visual-risk subset) |
| 12 — Refactor: decompose OrdersService | ✅ Done (uncommitted — Promo/Loyalty/Returns services; OrdersService orchestrates) |
| 13 — Refactor: test ergonomics + tag convention | ✅ Done (uncommitted — seed helpers + native-tag migration; client kept single-file by decision) |
| 14 — i18n, geolocation & device-emulation matrix | ✅ Done (`38e0115`) |
| 15 — Performance as a test layer + supporting SUT surfaces | ✅ Done (15a–15d shipped via `feat/i18n-geolocation-devices` and merged into `main`; 15e k6 deferred) |
| 16 — Mutation testing on pure helpers | ✅ Done (16a–16c shipped; 100 % score across 5 helpers, gate at 95 %) |
| 17 — Property-based testing | ✅ Done (fast-check companions on all 5 mutated files) |
| A — Tag-taxonomy expansion (scenario dimensions) | ✅ Done (`9bbf3ba`-ish on `feat/i18n-geolocation-devices`) |
| B — Retag existing 57 specs | ✅ Done |
| C — Six signature specs (RBAC matrix, JWT tamper, race, chaos, locale × payment matrix, empty states) | ✅ Done |
| D — Three edge/boundary specs (promo · loyalty · checkout) | ✅ Done |
| E — Vitest unit-pyramid base (apps/web + apps/api services) | ✅ Done (merged into `main` via PR #19) |
| F — Stryker mutate glob extended to orders/promo/geo services | ✅ Done (87.78 % measured, gate at 82 %) |

**Final shape (as of `main` HEAD `8d0c96a`):** 249 Playwright tests across 66 spec files (32 e2e + 31 api + 2 visual + 2 perf — and one `_generated/` draft, ignored by CI) and 175 Vitest unit/property tests across 16 test files in four packages (`@qa/contracts` 79 · `@qa/db` 30 · `@qa/web` 24 · `@qa/api` 46). Stryker mutates 8 source files (5 pure helpers + 3 services); pure helpers score 100 %, services 84-87 %, gate at 82 %. CI has 10 jobs (lint/typecheck, build-once, decide, unit, sanity, security+race, two sharded test jobs, mutation, perf+Lighthouse).

**Environment notes (this machine):** Node 20.19.6 (repo pinned to Node 20, not 22) · pnpm 9.15.4 via Corepack · Docker not installed — instead **Postgres 16 installed natively via Homebrew** (`brew services start postgresql@16`), role `qa`/db `qa`. CI will still use the `docker-compose.yml` service.

## Reference
- [overview.md](./overview.md) — role & mission, locked decisions, execution protocol
- [tech-stack.md](./tech-stack.md) — pinned technology stack (incl. Playwright MCP)
- [architecture.md](./architecture.md) — target tree + global engineering standards
- [running.md](./running.md) — environment variables, run locally, run in CI, Playwright MCP setup

## Phases
- ✅ [phase-0-scaffolding.md](./phase-0-scaffolding.md) — repo scaffolding & tooling
- ✅ [phase-1-database.md](./phase-1-database.md) — Prisma schema, migrations, seed
- ✅ [phase-2-api.md](./phase-2-api.md) — NestJS API (SUT) + Swagger
- ✅ [phase-3-frontend.md](./phase-3-frontend.md) — Next.js storefront (SUT)
- ✅ [phase-4-test-foundation.md](./phase-4-test-foundation.md) — fixtures, factories, clients, config
- ✅ [phase-5-test-suites.md](./phase-5-test-suites.md) — API + DB + UI test suites
- ✅ [phase-6-ci-cd.md](./phase-6-ci-cd.md) — GitHub Actions pipeline (live; 10 jobs gating PRs and main)
- ✅ [phase-7-agentic-mcp.md](./phase-7-agentic-mcp.md) — agentic testing layer + Playwright MCP (optional)
- ✅ [phase-8-documentation.md](./phase-8-documentation.md) — docs & portfolio polish
- ✅ [phase-9-promo-discovery.md](./phase-9-promo-discovery.md) — promo discovery (coupons under test)
- ✅ [phase-14-i18n-geolocation-devices.md](./phase-14-i18n-geolocation-devices.md) — i18n + geolocation (SUT) + built-in mobile/tablet emulation matrix
- ✅ [phase-15-performance.md](./phase-15-performance.md) — search/recs/metrics/cache surfaces + Lighthouse + Web Vitals perf budgets (15e k6 deferred)
- ✅ [phase-16-mutation-testing.md](./phase-16-mutation-testing.md) — Stryker on pure helpers + Vitest unit layer; committed mutation-score budget
- ✅ [phase-17-property-testing.md](./phase-17-property-testing.md) — fast-check property suites on all five mutated helpers

## Stack-improvement track (research-driven, ships after Phase 17)
- ✅ [phase-A-tag-taxonomy.md](./phase-A-tag-taxonomy.md) — seven scenario-dimension tags (`@negative` `@edge` `@boundary` `@empty` `@security` `@race` `@slow`)
- ✅ [phase-B-retag-existing.md](./phase-B-retag-existing.md) — backfill the 57 pre-A specs with scenario tags
- ✅ [phase-C-signature-specs.md](./phase-C-signature-specs.md) — six portfolio-distinctive specs (RBAC matrix, JWT tamper, race storm, fault injection, locale × payment matrix, empty states)
- ✅ [phase-D-edge-boundary.md](./phase-D-edge-boundary.md) — three edge/boundary specs on promo · loyalty · checkout
- ✅ [phase-E-pyramid-base.md](./phase-E-pyramid-base.md) — Vitest unit suites on 3 web providers/components + 3 api services
- ✅ [phase-F-mutation-services.md](./phase-F-mutation-services.md) — extend Stryker mutate glob to `orders.service` · `promo.service` · `geo.service`

## Refactoring track (behaviour-preserving — execute in order; suite is the safety net)
- ✅ [phase-10-refactor-contracts-sot.md](./phase-10-refactor-contracts-sot.md) — web consumes `@qa/contracts` types (kill 33 duplicates)
- ✅ [phase-11-refactor-web-ui-primitives.md](./phase-11-refactor-web-ui-primitives.md) — `Button`/visual/auth-guard primitives
- ✅ [phase-12-refactor-api-services.md](./phase-12-refactor-api-services.md) — split `OrdersService` (promo/loyalty/returns)
- ✅ [phase-13-refactor-test-ergonomics.md](./phase-13-refactor-test-ergonomics.md) — seeding helpers, client split, native tags
