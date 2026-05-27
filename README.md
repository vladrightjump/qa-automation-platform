# QA Automation Platform

A full-stack, monorepo **test automation** portfolio project. A deliberately small e-commerce app (the SUT) exists only as a vehicle for the tests. Its **signature capability**:

> Set up state via API → verify hidden side-effects in the database → confirm behavior in the UI — in **one** test, against the **same** Prisma client the API uses.

**Status — Phases 0–7 complete (Phase 6 awaits a real `git push`; Phase 8 = this docs pass).** 32 specs green locally · `@smoke` 9 specs in ~5 s · CI workflow validated locally.

---

## What this demonstrates

- **Cross-layer validation in a single spec.** API request → DB assertion (stock decrement, `AuditLog` row, `OrderStatus` transition, cart cleared) → UI assertion (order-status badge, redirect to confirmation). Three layers, one test, ground truth in the DB.
- **Test-first thinking baked into the SUT.** The application is built *for* the tests: deterministic product IDs, an env-guarded `POST /test/reset` seam, `data-testid` on every interactive element, the Prisma singleton re-exported so tests share the API's connection pool.
- **Contract-driven testing.** Every API response is parsed through a shared **Zod schema** (`packages/contracts`) inside the test API client. Drift fails *at the client* with a clear contract error — not as a confusing `undefined` later.
- **Parallel-safe by construction.** Each test owns its user (faker email, unique per test) and creates its own products via factories. Workers never race on stock.
- **CI shaped like a real pipeline.** Build-once → sharded Playwright matrix → merged HTML report. PRs run `@smoke` (~5 s); `main` runs the full suite. Postgres-as-a-service container, pnpm + browser caches, traces uploaded on failure.
- **Real cross-layer bugs caught.** Phase 4 surfaced a missing CORS header (the curl-only API verification missed it). Phase 5 surfaced a React hydration race that bounced authed users off protected pages. Both fixed in the SUT, not papered over in tests.

Deep design notes: **[ARCHITECTURE.md](./ARCHITECTURE.md)**. Step-by-step build plan: **[todos/](./todos/)**.

---

## Architecture

```
┌───────────────────────────── tests/ ────────────────────────────┐
│                                                                 │
│   tests/api/*.api.spec.ts       tests/api/*.db.spec.ts          │
│      (status + Zod contract)      (hidden side-effects)         │
│                                                                 │
│                  tests/e2e/*.e2e.spec.ts                        │
│              (state via API → flow in UI → assert in DB)        │
│                            │                                    │
│                            ▼                                    │
│    ┌─────────────────────────────────────────────────────┐      │
│    │  fixtures (composable Playwright)                   │      │
│    │   db (worker) · api · testUser · authedPage  (test) │      │
│    └────┬────────────────┬───────────────────────┬───────┘      │
└─────────┼────────────────┼───────────────────────┼──────────────┘
          │ Prisma         │ APIRequestContext     │ Page (browser)
          │                ▼                       ▼
          │      ┌──────────────────┐      ┌──────────────────┐
          │      │   NestJS API     │ ◄────│  Next.js 15 UI   │
          │      │  apps/api :3001  │  CORS│  apps/web :3000  │
          │      │  Swagger /docs   │      │  App Router      │
          │      └────────┬─────────┘      │  Tailwind 4      │
          │               │ Prisma         └──────────────────┘
          ▼               ▼
   ┌──────────────────────────────────┐
   │  Postgres 16                     │
   │   User · Product · Cart/Item     │
   │   Order/Item · AuditLog          │
   │   (the ground truth for tests)   │
   └──────────────────────────────────┘
```

`@qa/db` exports a **singleton** `PrismaClient`. The NestJS API and the test suite both import it — so when a test asserts `db.product.findUnique(...)`, it's reading the very rows the API just wrote, on the same connection pool. There is no mock layer to forget to keep in sync.

---

## The three-layer validation philosophy

The same product flow is validated three ways. Each layer catches what the others can't.

| Layer | File suffix | What it asserts | What it catches |
|---|---|---|---|
| **API** | `*.api.spec.ts` | Status codes, Zod-validated response shapes, math (totals, quantities) | Endpoint contract drift, validation regressions, auth |
| **DB** | `*.db.spec.ts` | Side-effects invisible to the API response — stock decrement, `OrderStatus` transitions, `AuditLog` rows, cart cleared | Silent state corruption, audit-trail loss, txn rollback bugs |
| **UI** | `*.e2e.spec.ts` | Browser flow via Page Objects, then DB ground-truth via `expect.poll` | Hydration races, missing CORS, broken `data-testid`, navigation bugs |

A test in the UI layer **doesn't trust the UI** to tell it the operation succeeded. It opens the DB and checks the row.

---

## Stack

pnpm workspaces + Turborepo · TypeScript (strict) · **NestJS 11** + **Prisma 6** + **PostgreSQL 16** · **Next.js 15** (App Router) + React 19 + **Tailwind 4** · **Playwright 1.50+** · **Zod 3.24+** · `@faker-js/faker` 9 · ESLint 9 (flat) + Prettier 3 · GitHub Actions.

Full pinned versions: [`todos/tech-stack.md`](./todos/tech-stack.md).

## Repo layout

```
apps/
  api/          NestJS SUT — auth · products · cart · checkout · orders · /test/reset
  web/          Next.js 15 storefront — App Router, Tailwind 4, token in localStorage
packages/
  db/           Prisma schema + migrations + singleton client (compiled to dist/)
  contracts/    Zod schemas + inferred types (compiled to dist/)
  config/       shared tsconfig.base.json / eslint flat config / prettier
tests/
  api/          *.api.spec.ts (API + Zod contract) · *.db.spec.ts (side-effects)
  e2e/          *.e2e.spec.ts (UI flow + DB ground truth)
  e2e/_generated/   agent-authored drafts (NEVER runs in CI — see Phase 7)
  pages/        Page Objects (intent, not click mechanics)
  fixtures/     db (worker) · api · testUser · authedPage
  factories/    faker-backed builders (UserFactory, ProductFactory)
  support/      typed API client over APIRequestContext, with Zod parsing
.github/workflows/ci.yml      build-once + sharded Playwright matrix
docker-compose.yml            Postgres 16 (CI service container parity)
todos/                        the full build plan, one file per phase
```

## Quick start

Prereqs: macOS / Linux / WSL2 · Node 20 LTS · Corepack · either Docker **or** Homebrew (for Postgres).

```bash
corepack enable                              # provides pnpm
pnpm install
cp .env.example .env                         # adjust DATABASE_URL if needed

# Postgres 16 — pick one:
docker compose up -d db                      # Docker path (matches CI)
# OR, macOS without Docker:
brew install postgresql@16 && brew services start postgresql@16
# and one-time:  /opt/homebrew/opt/postgresql@16/bin/psql -d postgres \
#   -c "CREATE ROLE qa LOGIN PASSWORD 'qa' CREATEDB;" \
#   && /opt/homebrew/opt/postgresql@16/bin/createdb -O qa qa

pnpm db:migrate                              # apply Prisma migrations
pnpm db:seed                                 # deterministic seed (idempotent)

# Build the workspace deps the apps consume
pnpm --filter @qa/db build
pnpm --filter @qa/contracts build
pnpm --filter @qa/api build
pnpm --filter @qa/web build

# Run the suite (Playwright auto-starts api + web via webServer)
pnpm --filter @qa/tests exec playwright install chromium   # one-time
pnpm test                                    # full suite (32 specs)
pnpm --filter @qa/tests run test:smoke       # @smoke only (~5 s, 9 specs)

pnpm lint && pnpm typecheck                  # 10/10 across the monorepo

# After a failure:
pnpm --filter @qa/tests exec playwright show-report tests/playwright-report
```

Day-to-day dev (hot-reload): `pnpm --filter @qa/api dev` + `pnpm --filter @qa/web dev`.

## Tests

| Layer | Files | Specs |
|---|---|---|
| API contracts | `tests/api/*.api.spec.ts` × 4 | 21 |
| DB side-effects | `tests/api/*.db.spec.ts` × 2 | 3 |
| UI hybrid (incl. POMs) | `tests/e2e/*.e2e.spec.ts` × 4 | 8 |
| **Total** | **10 files** | **32 — 9 `@smoke` + 23 `@regression`** |

Every spec is tagged `@smoke` or `@regression`. The signature DB-layer spec ([`tests/api/checkout.db.spec.ts`](./tests/api/checkout.db.spec.ts)) asserts the full transactional side-effect surface of one checkout in one place.

## CI

[`.github/workflows/ci.yml`](./.github/workflows/ci.yml):

```
lint  ─┐                                                       (fast feedback)
build ─┴──► test (shard 1/2) ──┐
              test (shard 2/2) ──┴──► merge-reports (HTML, 14-day artifact)
```

- **Postgres 16** as a service container with `pg_isready` healthcheck (mirrors local `docker-compose.yml`).
- **pnpm store** cached via `actions/setup-node`; **Playwright browsers** cached at `~/.cache/ms-playwright`.
- **PRs** run `@smoke` only (~5 s wall); **pushes to `main`** run the full suite.
- **Failure artifacts:** per-shard traces, videos, screenshots (7-day). **Merged HTML report:** always (14-day).
- **Concurrency:** in-flight PR runs are cancelled on new commits; `main` runs queue.

Live CI report: _TBD — populated once the repo is pushed to GitHub._

## Agentic authoring (Phase 7, optional)

[`.mcp.json`](./.mcp.json) registers a **Playwright MCP** server so any MCP-aware agent (Claude Code, Cursor, …) can drive a real browser against the local SUT and propose new specs. Drafts land in [`tests/e2e/_generated/`](./tests/e2e/_generated/) and are excluded from the deterministic suite **three ways**: `testMatch` (only `*.spec.ts`), `testIgnore` (`**/_generated/**`), and `test.describe.skip(…)` inside each draft. Never runs in CI. Promoted only after human review. See [`todos/phase-7-agentic-mcp.md`](./todos/phase-7-agentic-mcp.md).

## Further reading

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — fixture composition, isolation strategy, why API-driven setup, real cross-layer bugs caught.
- **[todos/](./todos/)** — the original build plan, one file per phase, each with an "as built" status block.
- **[`apps/api`](./apps/api/) on `:3001/docs`** — Swagger UI when the API is running.
