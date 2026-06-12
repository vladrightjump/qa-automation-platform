# Architecture

Design notes. README is the *what*; this is the *why*.

## SUT shape

```
┌──────────────────────────────────────────────────────────────────┐
│ apps/web (Next.js)         apps/api (NestJS)        Postgres     │
│                                                                  │
│   browser ─────HTTP────► /products  /cart  /orders  /addresses   │
│                          /auth/*    /admin/products              │
│       │                          │                               │
│       └──── lib/api.ts ─────►    │                               │
│                                  └──► Prisma ─────► postgres     │
│                                                                  │
│ tests/                                                           │
│   api-clients/ ──HTTP──► same API surface                        │
│   db          ◄── same Prisma singleton ──┘                      │
└──────────────────────────────────────────────────────────────────┘
```

Three layers, one Prisma client. Tests don't observe via a second DB
connection — they observe via the same pool the API mutates, which is
the whole point.

## Test layers

- **API specs** (`tests/api/`) drive the HTTP surface through
  Zod-validated clients. Contract drift fails at the parse step with
  the offending field highlighted.
- **e2e specs** (`tests/e2e/`) drive the browser through Page Objects.
  Most also set up state via API + verify hidden side-effects in the
  DB. That's the cross-layer assertion the project is organised
  around.
- **Vitest unit specs** in `apps/web` cover lib helpers + a few
  components in isolation.

## How one test asserts across layers

`tests/e2e/checkout.e2e.spec.ts` — the canonical example:

1. Seed a fresh user via the `testUser` fixture (API → `/auth/register`).
2. Seed a default shipping address via `api.checkout.createAddress`.
3. Seed a product via `db.product.create` (the API has no
   product-create surface for users).
4. Walk the UI: open the product detail page, add to cart, navigate
   to checkout, click *Place order*.
5. Assert against the **API response**: order status is `PAID`.
6. Assert against the **DB**: the audit log row is written, the
   product stock is decremented, the cart is empty but its row
   remains.

If any layer drifts — API renames a field, the side-effect breaks,
the UI button moves — exactly one of those assertions fails first
and points at the right layer.

## Shared Zod schemas

`packages/contracts/src/index.ts` exposes one schema per API entity.
Both the API (responses are validated DTOs) and the test clients
(every response is parsed) consume the same schemas, so a contract
change is a single edit visible to both ends.

## CI

`.github/workflows/ci.yml` runs four jobs: lint+typecheck → unit ‖
build → playwright. PRs run the `@smoke` subset; pushes to main run
the full suite. Reports upload as artifacts on failure.
