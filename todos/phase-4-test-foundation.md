# Phase 4 — Test Foundation

**Objective:** The fixtures, factories, clients, and config the suites build on.

**Build:**
- `packages/contracts`: Zod schemas for User/Product/Order; derive types from them.
- `tests/support/api-client.ts`: typed wrapper over `APIRequestContext` (createUser, login, seedProduct, addToCart, checkout…).
- `tests/factories`: faker-backed builders (UserFactory, ProductFactory) producing valid Zod-conformant data.
- `tests/fixtures/index.ts`: composable fixtures — `db` (worker-scoped Prisma client), `api` (test-scoped client), `testUser` (created via API, isolated per test), `authedPage` (browser context with injected token / `storageState`).
- `playwright.config.ts`: projects, parallelism, sharding-ready, trace/video/screenshot on failure, HTML reporter, `@smoke`/`@regression` grep wiring, `webServer` to boot api+web (or assume already running).

**Definition of Done:** A trivial smoke spec using `authedPage` + `api` + `db` passes locally.

**Checkpoint:** Report the fixtures file and `playwright.config.ts`. Stop.
