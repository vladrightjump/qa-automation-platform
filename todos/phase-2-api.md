# Phase 2 — Backend API (SUT)

**Objective:** A lean NestJS API exposing the five core flows, with Swagger/OpenAPI.

**Build:**
- NestJS app in `apps/api` consuming `packages/db`.
- Endpoints: auth (register/login → token), products (list/get), cart (add/remove/view), checkout (POST /orders → creates order, marks PAID, decrements stock, writes AuditLog), orders (list/get).
- Token-based auth (JWT or simple bearer — keep minimal).
- Swagger UI at `/docs`; export the OpenAPI spec.
- Server-side validation via class-validator / DTOs.
- A test-only seed/reset endpoint guarded by env flag (a clean test seam).

**Definition of Done:** API boots, `/docs` renders, and the full flow (register → add to cart → checkout) works via curl/Swagger, with stock decremented and an audit row written.

**Checkpoint:** Report endpoint list + the checkout side-effects. Stop.

---

## ✅ Status — DONE (uncommitted)

DoD met: API boots on `:3001`, `/docs` renders Swagger UI, and the full flow (register → add to cart → checkout) succeeds with all expected DB side-effects (stock decrement, `OrderStatus=PAID`, `AuditLog` row, cart cleared).

### Endpoint list

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/register` | — | `{email, password}` → `{token, user}` |
| POST | `/auth/login` | — | same shape |
| GET  | `/products` | — | list (sorted by id for deterministic tests) |
| GET  | `/products/:id` | — | 404 if missing |
| GET  | `/cart` | Bearer | upserts a cart on first view |
| POST | `/cart/items` | Bearer | `{productId, quantity}` — `cartId+productId` unique → upsert with `increment` |
| DELETE | `/cart/items/:productId` | Bearer | — |
| POST | `/orders` | Bearer | **checkout** — see side-effects below |
| GET  | `/orders` | Bearer | user's orders (desc by createdAt) |
| GET  | `/orders/:id` | Bearer | 403 if order belongs to a different user |
| POST | `/test/reset` | guarded | wipes user/cart/order/audit; products untouched (404s when `ENABLE_TEST_ENDPOINTS != 'true'`) |
| GET  | `/docs` | — | Swagger UI (also `/docs-json`) |

### Checkout side-effects (verified)

Single `prisma.$transaction`:

1. For each cart item: `UPDATE Product SET stock = stock - q WHERE id = ? AND stock >= q` — conditional decrement that 0-rows on a race and rolls the txn back.
2. `Order` created with `status = PAID`, `totalCents = Σ priceCents × quantity`, plus `OrderItem` rows that snapshot `unitPriceCents` at purchase time.
3. `AuditLog` row: `action: 'ORDER_PAID'`, `entity: 'Order'`, `entityId: order.id`, `metadata: { totalCents, itemCount }`.
4. `CartItem` rows deleted (cart row kept).

End-to-end verified with curl: `prod_widget` 50→48, `prod_gizmo` 20→19, totalCents 6997, one `ORDER_PAID` audit row, `CartItem` count 0. Negative paths verified: 401 without bearer, 400 on out-of-stock (`prod_oos`) with clear message, 400 + field-level messages on validation failure.

### As built — notable choices

- **JWT** via `@nestjs/jwt` (HS256, 1d expiry, `JWT_SECRET` env). Custom `AuthGuard` parses `Authorization: Bearer …`, verifies, attaches `req.user`. `@CurrentUser()` param decorator pulls it into handlers. No Passport — keeps deps lean.
- **bcryptjs** for password hashing (pure JS, no native build).
- **Validation:** global `ValidationPipe({ whitelist, forbidNonWhitelisted, transform })` + class-validator DTOs (`IsEmail`, `MinLength`, `IsInt`/`Min`/`Max`).
- **Test seam:** `POST /test/reset` lives in `TestModule` behind `TestEndpointsGuard`. When `ENABLE_TEST_ENDPOINTS` isn't `'true'` the guard throws `NotFoundException` — looks like the route doesn't exist.
- **DB seam:** services do `import { prisma } from '@qa/db'` directly — no `PrismaService` wrapper. Tests will import the same singleton and observe the same connection pool.

### Build / runtime — what changed

- `@qa/db` now builds to `dist/` (`tsc -p tsconfig.build.json`), drops `"type": "module"`, `main` → `./dist/index.js`. The CommonJS NestJS app can require it cleanly.
- `apps/api` is CommonJS with `experimentalDecorators` + **`emitDecoratorMetadata`** — NestJS DI needs the metadata. `tsx` (esbuild) doesn't emit it, so dev/start use **`ts-node-dev`** / compiled JS instead.
- Scripts (apps/api): `dev` = `ts-node-dev --respawn src/main.ts`, `build` = `tsc`, `start` = `node dist/main.js`. All loaded via `dotenv-cli` pointing at root `.env`.

**Carry-over for later phases:** Phase 4 tests can `import { prisma, OrderStatus } from '@qa/db'` and hit the API via Playwright's `APIRequestContext` against `http://localhost:3001`. The `/test/reset` endpoint is the per-test isolation hook.
