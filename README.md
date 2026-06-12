# QA Automation Platform

A focused **test automation** portfolio. A minimal e-commerce storefront
(the SUT) exists as a vehicle for the tests. The signature move:

> Set up state via API → verify hidden side-effects in the database →
> confirm behavior in the UI — in **one** test, against the **same**
> Prisma client the API uses.

## What this is

- A Next.js + NestJS + Prisma monorepo, all in one repo.
- ~25 e2e specs and ~30 api specs, all chromium-desktop, full suite
  runs in under a minute on a 4-core laptop.
- Six page objects, six domain API clients, four short docs.
- Designed to be read in 15 minutes, not 15 hours.

## 60-second try-it

Requires Node 20 + pnpm 9 + Docker (for Postgres).

```sh
cp .env.example .env                       # local dev defaults
docker compose up -d postgres              # boot Postgres
pnpm install
pnpm -F @qa/db exec prisma migrate deploy  # apply the _init migration
pnpm -F @qa/db seed                        # 10 deterministic products + admin
pnpm -F @qa/tests exec playwright install --with-deps chromium
pnpm -F @qa/tests test                     # full suite, ~60s
```

Web is at <http://localhost:3000>, API at <http://localhost:3001> when
Playwright boots them automatically. To run the app standalone:

```sh
pnpm -F @qa/api dev   # in one terminal
pnpm -F @qa/web dev   # in another
```

Demo user: `admin@example.com` / `Admin123!`.

## Repo layout

```
apps/
  api/     NestJS API (auth, products, cart, orders, addresses, admin)
  web/     Next.js storefront (catalog → cart → checkout → orders)
packages/
  contracts/   Zod schemas — single source of truth for API entities
  db/          Prisma client + schema + seed
  config/      shared tsconfig + eslint
tests/
  e2e/         6 specs: smoke, catalog, cart, checkout, orders, admin
  api/         6 specs: auth, products, cart, checkout, orders, admin-products
  api-clients/ 7 files: base + one per domain
  pages/       6 POMs: auth, catalog, cart, checkout, orders, admin
  fixtures/    composable Playwright fixtures
  factories/   builder fns for users, products, addresses
.github/workflows/ci.yml   one workflow: lint → unit + build → playwright
```

## Tech stack

| Layer    | Tool                 | Why                                   |
| -------- | -------------------- | ------------------------------------- |
| Tests    | Playwright           | Same client drives UI + API in one spec |
| API      | NestJS               | DI + Nest's testing utilities         |
| Web      | Next.js (App Router) | Modern React surface                  |
| DB       | Prisma + Postgres    | Typed access, shared singleton        |
| Schemas  | Zod                  | Contracts asserted at the boundary    |
| Runtime  | pnpm workspaces      | Atomic CI install                     |

## What I'd add next

- **Multi-browser smoke** — webkit + a phone profile for the @smoke
  subset. Skipped here because cross-engine maintenance has low signal
  for a single-author portfolio.
- **Visual regression** — Playwright snapshots are easy to author but
  brittle across OS/font versions. Worth the investment in a team
  repo, not in a hiring sample.
- **Mutation + property tests** — earlier iterations of this repo ran
  Stryker and `fast-check`; both were removed for signal-to-noise.

## Docs

- [ARCHITECTURE.md](ARCHITECTURE.md) — SUT layout + how a test asserts
  across all three layers.
- [tests/README.md](tests/README.md) — fixtures, POMs, API clients,
  adding a new test.
- [tests/TESTING.md](tests/TESTING.md) — running tests, common
  assertion patterns, trace viewer.
