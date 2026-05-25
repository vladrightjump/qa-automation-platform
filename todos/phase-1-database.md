# Phase 1 — Database Layer

**Objective:** The Prisma schema, migrations, seed, and an exported client the tests will reuse.

**Build:**
- `packages/db` with Prisma + Postgres datasource.
- Schema: `User`, `Product` (with `stock`, `priceCents`), `Cart` + `CartItem`, `Order` + `OrderItem` (with `OrderStatus` enum: PENDING/PAID/FULFILLED/CANCELLED), `AuditLog`.
- Export a singleton `PrismaClient` from the package.
- Idempotent seed script: a handful of products with known IDs/stock for deterministic tests.
- First migration committed.

**Definition of Done:** `pnpm db:migrate` provisions a local Postgres schema and `pnpm db:seed` populates it repeatably.

**Checkpoint:** Report the final `schema.prisma` and seed strategy. Stop.
