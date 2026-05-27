# Phase 1 — Database Layer

> **Prerequisite:** needs a reachable PostgreSQL. Three options — `docker compose up -d db` (matches CI), `brew install postgresql@16 && brew services start postgresql@16` (macOS native — the path used here), or a hosted Postgres (set `DATABASE_URL`). See [running.md](./running.md).

**Objective:** The Prisma schema, migrations, seed, and an exported client the tests will reuse.

**Build:**
- `packages/db` with Prisma + Postgres datasource.
- Schema: `User`, `Product` (with `stock`, `priceCents`), `Cart` + `CartItem`, `Order` + `OrderItem` (with `OrderStatus` enum: PENDING/PAID/FULFILLED/CANCELLED), `AuditLog`.
- Export a singleton `PrismaClient` from the package.
- Idempotent seed script: a handful of products with known IDs/stock for deterministic tests.
- First migration committed.

**Definition of Done:** `pnpm db:migrate` provisions a local Postgres schema and `pnpm db:seed` populates it repeatably.

**Checkpoint:** Report the final `schema.prisma` and seed strategy. Stop.

---

## ✅ Status — DONE (uncommitted)

DoD met: `pnpm db:migrate` (Prisma `migrate deploy`) applies the committed `20260526025905_init` migration; `pnpm db:seed` upserts 4 deterministic products and is repeatable.

**As built:**
- `packages/db/prisma/schema.prisma` — `User`, `Product` (with deterministic string IDs), `Cart`, `CartItem`, `Order`, `OrderItem`, `OrderStatus` enum (`PENDING`/`PAID`/`FULFILLED`/`CANCELLED`), `AuditLog` (with `(entity,entityId)` and `(action,createdAt)` indexes for cheap test-time queries).
- `packages/db/prisma/migrations/20260526025905_init/migration.sql` — first migration, committed.
- `packages/db/prisma/seed.ts` — idempotent seed (`prisma.product.upsert`) for 4 products: `prod_widget`, `prod_gizmo`, `prod_thingamajig`, `prod_oos` (zero stock for the negative-path tests).
- `packages/db/src/index.ts` — singleton `PrismaClient` (cached on `globalThis` outside production) and re-exports `@prisma/client` types so consumers `import { prisma, Product, OrderStatus } from '@qa/db'`.
- Scripts (root + workspace): `db:migrate` → `prisma migrate deploy`, `db:seed` → `tsx prisma/seed.ts`, plus `migrate:dev`, `reset`, `studio`, `generate`. All env-loaded via `dotenv-cli` pointing at root `.env`.
- New deps: `@prisma/client`, `prisma`, `tsx`, `dotenv-cli` (db); `@types/node` (root).

**Seed strategy:** deterministic product IDs + `upsert` keyed on `id`. Tests query by ID with no fixture coupling. Re-runs touch only `name`/`description`/`priceCents`/`stock`; user/cart/order data is left alone so partial-state tests are unaffected.

**Local Postgres:** native Homebrew `postgresql@16` (no Docker). Role `qa` with `LOGIN CREATEDB`, db `qa` owned by `qa`. CI keeps using the `docker-compose.yml` service container.
