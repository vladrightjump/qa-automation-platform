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
