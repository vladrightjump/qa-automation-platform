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
- 🟡 [phase-6-ci-cd.md](./phase-6-ci-cd.md) — GitHub Actions pipeline (authored, awaits push)
- ✅ [phase-7-agentic-mcp.md](./phase-7-agentic-mcp.md) — agentic testing layer + Playwright MCP (optional)
- ✅ [phase-8-documentation.md](./phase-8-documentation.md) — docs & portfolio polish
