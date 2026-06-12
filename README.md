# QA Automation Platform

A focused **test automation** portfolio. A minimal e-commerce storefront
(the SUT) exists as a vehicle for the tests. The signature move:

> Set up state via API → verify hidden side-effects in the database →
> confirm behavior in the UI — in **one** test, against the **same**
> Prisma client the API uses.

## Run it locally

Requires Node 20 + pnpm 9 + Docker.

```sh
cp .env.example .env
docker compose up -d postgres
pnpm install
pnpm -F @qa/db exec prisma migrate deploy
pnpm -F @qa/db seed
pnpm -F @qa/tests exec playwright install --with-deps chromium
pnpm -F @qa/tests test            # full suite, ~60s
```

Web at <http://localhost:3000>, API at <http://localhost:3001> — Playwright
boots both. For dev:

```sh
pnpm -F @qa/api dev   # one terminal
pnpm -F @qa/web dev   # another
```

Demo admin: `admin@example.com` / `Admin123!`.

## Layout

```
apps/api/    NestJS — auth, products, cart, orders, addresses, admin
apps/web/    Next.js — catalog → cart → checkout → orders
packages/
  contracts/ Zod schemas (shared SoT for API entities)
  db/        Prisma client + schema + seed
  config/    shared tsconfig + eslint
tests/       6 e2e + 6 api specs, POMs, API clients, fixtures
.github/workflows/ci.yml   one workflow: lint → unit + build → playwright
```

## Architecture

Three layers, **one Prisma client**. Tests observe via the same pool
the API mutates.

```
browser ─HTTP─► apps/api ─Prisma─► postgres
                   ▲                  ▲
                   │                  │
tests/api-clients ─┘     tests/db (same singleton)
```

`packages/contracts/src/index.ts` exposes one Zod schema per API entity.
The API validates responses against them, the test clients parse every
response through them — contract drift fails at the boundary, not at
the assertion site.

## How one test asserts across layers

`tests/e2e/checkout.e2e.spec.ts` is the canonical example: seed a user
(`api.auth.register`), seed a default address (`api.checkout.createAddress`),
seed a product (`db.product.create`), drive the UI through the cart and
checkout POMs, then assert against (a) the API response status, (b) the
DB audit log + stock decrement, (c) the rendered confirmation hero.

If any layer drifts — API renames a field, the side-effect breaks, the
UI button moves — exactly one assertion fails first and names the
right layer.

## Tech stack

| Layer    | Tool                 | Why                                    |
| -------- | -------------------- | -------------------------------------- |
| Tests    | Playwright           | Same client drives UI + API in one spec |
| API      | NestJS               | DI + Nest's testing utilities          |
| Web      | Next.js (App Router) | Modern React surface                   |
| DB       | Prisma + Postgres    | Typed access, shared singleton         |
| Schemas  | Zod                  | Contracts asserted at the boundary     |
| Runtime  | pnpm workspaces      | Atomic CI install                      |

## What I'd add next

- **Multi-browser smoke** — webkit + a phone profile for `@smoke`.
  Skipped: cross-engine maintenance is low signal for a solo portfolio.
- **Visual regression** — Playwright snapshots are easy to author but
  brittle across OS/font versions.
- **Mutation + property tests** — earlier iterations used Stryker and
  `fast-check`; both were removed for signal-to-noise.

See [tests/README.md](tests/README.md) for fixtures, POMs, API clients,
running, and debugging.
