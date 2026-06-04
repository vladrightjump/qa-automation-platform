# Phase 15 — Performance as a test layer + SUT surfaces that justify it

> **Type:** SUT feature extension **+** test-infra extension. Adds endpoints
> and UI affordances whose performance is interesting to measure (search,
> autocomplete, recommendations, admin metrics, a thin caching layer) and a
> dedicated performance test layer (Lighthouse + web-vitals + k6) with
> committed budgets that fail CI on regression.

**Problem / motivation.** Today the test pyramid has three layers (API
contract → DB side-effects → UI flow + DB ground truth) but every layer
asserts on *correctness*. Performance is the next standing axis of
regression risk and has zero coverage: an N+1 query in `/products`, a
missing index after a migration, an SSR change that drops LCP, a bundle
bloat from a new dep — none of those fail any current spec. Phase 15 makes
performance a first-class assertion and grows the SUT just enough to give
those assertions something realistic to bite on.

**Locked invariants — what perf testing in this repo means.**

- **Budgets live in code, not in an external dashboard.** A regression past a
  committed budget fails CI just like a functional bug. Reviewers see the
  diff in the PR.
- **Perf tests run against the same SUT, same DB, same seed** as the rest of
  the suite — no separate perf environment, no mocked downstreams. Only the
  data volume changes (via the bulk-seed test seam).
- **Determinism over realism for assertions.** Budgets are sized for the CI
  runner profile (recorded in the budgets file). Trend reports are advisory;
  budget breaches are blocking. The bulk seed is deterministic (fixed RNG
  seed) so percentile assertions are stable.
- **Every new endpoint still goes through `@qa/contracts`** (Phase 10 rule).
  No drift, no per-endpoint type duplicates.
- **Cache observability is contractual.** Cached endpoints set
  `X-Cache: hit|miss` and respect a `Cache-Control: no-cache` bypass header so
  perf tests can drive both states.

**Objective.** (1) Add search + autocomplete, a personalized
recommendations endpoint, an admin sales-metrics endpoint, a thin in-process
caching layer with observable cache headers, and an env-guarded bulk-seed
test seam. (2) Add a perf test layer: per-route Lighthouse + Core Web Vitals
assertions, k6 load scripts for the hot API paths, a committed budgets file,
and a nightly CI job that posts a budget diff to PRs.

---

## Build

### Contracts (`packages/contracts/src/`)

- New `search.ts`:
  - `ProductSearchResultSchema` — `ProductSchema` extended with `{ score:
    number, highlights: { name?: string, description?: string } }`.
  - `PagedSearchSchema = { items, total, page, pageSize, tookMs }`.
  - `SuggestionSchema = { value: string, productId: string | null }`.
  - `SuggestionListSchema = z.array(SuggestionSchema)`.
- New `recommendations.ts`:
  - `RecommendationKindSchema = z.enum(['recently-viewed', 'same-category',
    'collaborative'])`.
  - `RecommendationSchema = { kind: RecommendationKind, product: Product,
    score: number, reason: string }`.
  - `RecommendationListSchema = z.array(RecommendationSchema)`.
- New `metrics.ts`:
  - `SalesMetricsSchema = { totalRevenueCents, orderCount, averageOrderValueCents,
    byCategory: Array<{ category: ProductCategory, revenueCents, orderCount }>,
    topProducts: Array<{ productId, name, unitsSold, revenueCents }>,
    range: { fromIso, toIso } }`.
- Re-export from `index.ts`. **No money-math changes** — phase 14 invariant
  intact.

### Data model (`packages/db/prisma/schema.prisma`)

- `Product.searchVector Unsupported("tsvector")?` + `@@index` (raw migration
  for the `tsvector` column + GIN index + trigger that maintains it from
  `name || ' ' || description || ' ' || coalesce(tags::text, '')`).
- New `RecommendationView` materialized view (raw migration) over
  `OrderItem` × `Product` that pre-computes "users who bought X also bought
  Y" co-occurrence counts. Refresh hook lives on the bulk-seed seam.
- Migration name: `…_add_search_and_recommendations`.
- Seed: a deterministic `seedBulkProducts(n, { rngSeed })` helper in
  `packages/db/src/seed-helpers.ts` (used by both the test seam and the perf
  suite).

### API (`apps/api/src`)

- **Search module** (`apps/api/src/search/`):
  - `GET /products/search?q=&category=&page=&pageSize=` — Postgres FTS via
    `to_tsquery(plainto_tsquery, …)`; ranks with `ts_rank_cd`. Returns
    `PagedSearchSchema` with `tookMs` measured server-side.
  - `GET /products/suggestions?q=&limit=` — prefix-match autocomplete using
    a btree index on `lower(name)`; capped at 8 results, sub-50ms p95
    target.
- **Recommendations module** (`apps/api/src/recommendations/`):
  - `GET /recommendations` (authed): unions three signals, dedupes, caps at
    12. Signals:
      1. *recently-viewed* — pulls from the client-supplied
         `X-Recently-Viewed: prod_a,prod_b,...` header (the storefront
         already tracks this in `localStorage`), maps to same-category
         products.
      2. *same-category* — by the user's most-recent paid order's
         categories.
      3. *collaborative* — the materialized view above.
  - Scoring is documented and deterministic so an e2e test can assert
    "given seeded user U, the top 3 are X/Y/Z".
- **Admin metrics module** (`apps/api/src/admin/metrics/`):
  - `GET /admin/metrics/sales?from=&to=` — single SQL query joining `Order`,
    `OrderItem`, `Product`. Validates `from <= to`, rejects ranges longer
    than 1 year. Returns `SalesMetricsSchema`. **Intentionally slow** at
    scale — this is the perf-budget poster child.
- **Caching layer** (`apps/api/src/cache/`):
  - In-process LRU via `@nestjs/cache-manager` + `cache-manager`'s default
    memory store (no Redis dep). 30s TTL on the catalog list + suggestions.
  - `CacheInterceptor` reads `Cache-Control: no-cache` request header and
    bypasses; sets `X-Cache: hit | miss | bypass` on every response it
    handles. Tests assert on the header to validate the cache surface, not
    on timing.
- **Bulk-seed test seam** (extend `apps/api/src/test/`):
  - `POST /test/bulk-seed-products` body `{ count: number, rngSeed?: number
    }` → calls `seedBulkProducts`. Env-guarded by existing
    `ENABLE_TEST_ENDPOINTS=true`. Idempotent for the same seed.
  - `POST /test/refresh-views` → `REFRESH MATERIALIZED VIEW
    "RecommendationView"`. Same env gate.

### Web (`apps/web`)

- **Search box + autocomplete** (`apps/web/components/SearchBox.tsx`):
  - Debounced input (250ms) calls `GET /products/suggestions`.
  - Dropdown lists up to 8 results with arrow-key navigation and Enter to
    navigate to the product, Cmd/Ctrl+Enter to navigate to
    `/?q=<value>` for a full search.
  - `data-testid="search-box"`, `search-suggestion-${productId}`,
    `search-suggestion-empty`.
- **Search results route** (`apps/web/app/search/page.tsx`):
  - Reads `?q=` from URL, calls `GET /products/search`, renders the existing
    `ProductCard` grid with highlight chips for matched tokens. Localized
    via Phase 14's `useLocale`.
- **Recommendations carousel** (`apps/web/components/Recommendations.tsx`):
  - Replaces the existing `RecentlyViewed` placement on `/` and `/cart` with
    a richer 3-row carousel labelled by `recommendation.kind` and
    `reason`. Falls back to `RecentlyViewed` when unauthenticated.
- **Admin metrics page** (`apps/web/app/admin/metrics/page.tsx`):
  - Date range picker + simple cards (no chart libs); table of top products.
  - Surfaces the `X-Cache` response header in a small dev-only chip so
    visual specs can see hit/miss state.

### Perf test layer

#### Module 1 — Lighthouse + Core Web Vitals (`tests/perf/lighthouse/`)

- New dep: `playwright-lighthouse` (wraps Lighthouse around a Playwright
  page). No external Lighthouse-CI binary.
- New Playwright project `lighthouse-perf` in `tests/playwright.config.ts`:
  ```ts
  {
    name: 'lighthouse-perf',
    testMatch: /.*\.perf\.spec\.ts/,
    use: { ...devices['Desktop Chrome'], storageState: USER_STATE,
           launchOptions: { args: ['--remote-debugging-port=9222'] } },
    dependencies: ['setup'],
  }
  ```
- `tests/perf/budgets.json` (committed source of truth):
  ```json
  {
    "runner": "ci-ubuntu-2025-04",
    "routes": {
      "/":            { "lcp": 2500, "cls": 0.1, "inp": 200, "tbt": 200 },
      "/products/prod_widget": { "lcp": 2500, "cls": 0.1, "inp": 200, "tbt": 250 },
      "/search?q=widget":       { "lcp": 3000, "cls": 0.1, "inp": 250 },
      "/cart":        { "lcp": 2500, "cls": 0.1, "inp": 200 },
      "/checkout":    { "lcp": 3000, "cls": 0.1, "inp": 300 },
      "/admin/metrics": { "lcp": 3500, "cls": 0.1, "inp": 400 }
    }
  }
  ```
- `tests/perf/lighthouse/routes.perf.spec.ts` — one test per route, asserts
  `vitals.lcp <= budget.lcp` etc. Tag `@perf @regression`. Skip on
  non-`lighthouse-perf` projects.
- **Real-user vitals capture** (`tests/perf/web-vitals.perf.spec.ts`) — uses
  the `web-vitals` library injected via `page.addInitScript` and asserts the
  CLS/LCP/INP it actually emits during a scripted user journey (more
  representative than Lighthouse's synthetic flow for INP).

#### Module 2 — k6 API load (`tests/perf/k6/`)

- New devDep: `k6` (binary installed in CI via the official action; locally
  via `brew install k6`).
- Scripts, one per scenario, each importing a shared
  `tests/perf/k6/lib/http.js`:
  - `catalog-browse.k6.js` — 200 VUs, 5 min, mixed `GET /products`, `GET
    /products/:id`, with a 30% cache-miss share via the `Cache-Control`
    bypass header.
  - `search.k6.js` — 100 VUs ramping to 500, 5 min, queries drawn from a
    deterministic dictionary.
  - `checkout-contention.k6.js` — 50 VUs against a single product with
    `stock=200`; asserts the API serializes correctly (no negative stock in
    the DB after the run; checked by a teardown step that hits
    `/admin/products/:id`).
  - `recommendations.k6.js` — 100 VUs, authed (`k6/http` with seeded
    tokens).
- Per-script `thresholds` in code, e.g. `http_req_duration{type:read}: ['p(95)<200']`,
  `http_req_failed: ['rate<0.01']`. k6 exits non-zero on threshold breach
  so CI naturally fails.
- `tests/perf/k6/budgets.json` records the p50/p95/p99 baseline per scenario
  + a `tolerance` (e.g. 20%) for the trend report.

#### Module 3 — runner & reporting (`tests/perf/runner/`)

- `tests/perf/runner/run.ts` — orchestrates: (1) ensure API + web are up
  (reuse Playwright's `webServer` boot), (2) bulk-seed N products via
  `/test/bulk-seed-products`, (3) refresh materialized view, (4) execute
  Lighthouse + k6 in sequence, (5) write `tests/perf/results/<runId>.json`
  with parsed metrics + budget verdicts.
- `tests/perf/runner/diff.ts` — compares the current run against
  `tests/perf/baselines/latest.json` (committed) and prints a markdown
  summary suitable for a PR comment.
- `package.json` scripts (in `tests/`):
  - `perf:lighthouse` → `playwright test --project lighthouse-perf`
  - `perf:k6` → `node perf/runner/run.ts --k6`
  - `perf:all` → `pnpm perf:lighthouse && pnpm perf:k6`
  - `perf:diff` → `node perf/runner/diff.ts`

#### Module 4 — CI (`.github/workflows/perf.yml`)

- Nightly cron + `workflow_dispatch`. Postgres service container,
  `actions/setup-node`, `grafana/setup-k6-action@v1`, Playwright browsers
  cached.
- Steps: build → migrate → seed → start API + web (`webServer` already
  handles this when invoked via `playwright test`) → `perf:lighthouse` →
  `perf:k6` → `perf:diff` → upload `tests/perf/results/` as an artifact
  (30d) → comment on the most recent open PR with the diff (skip if none).
- Budget breach = non-zero exit; the run goes red on the dashboard but does
  not block PRs that didn't touch SUT code (job is `if:` gated on file
  paths: anything under `apps/`, `packages/`, `tests/perf/`).

### Tests (correctness specs for the new surfaces — separate from perf)

These specs prove the *functional* behaviour of the new endpoints, like every
phase before. They live in `tests/api/` and `tests/e2e/` with the existing
tag convention; tag families gained: `@search`, `@recommendations`,
`@metrics`, `@cache`, `@perf` (the last is for perf-budget specs only).

- `tests/api/search.api.spec.ts` (`@search`):
  - Contract: `PagedSearchSchema`.
  - Relevance: `q=widget` ranks `prod_widget` above `prod_doohickey` when
    both match.
  - Empty query → 400.
  - `X-Cache` header present on the response.
- `tests/api/suggestions.api.spec.ts` (`@search`):
  - Returns `<= limit` items, sorted, all prefix-matched.
  - Sub-50ms p95 across 50 cold + 50 warm requests (uses
    `expect.poll` to gather a p95 — *not* a perf-budget assertion, a
    contract on cache effectiveness).
- `tests/api/recommendations.api.spec.ts` (`@recommendations @sanity`):
  - Given a seeded user with one paid order in `gadgets`, the response
    contains at least one `same-category` rec from the same category and a
    `collaborative` rec whose product appears in the materialized view.
  - Unauthenticated → 401.
- `tests/api/metrics.api.spec.ts` (`@metrics @admin`):
  - Admin only (USER → 403).
  - Sum invariant: `totalRevenueCents === sum(items.unitPriceCents *
    items.quantity)` for the date range — asserted by recomputing from the
    DB via the `db` fixture.
- `tests/api/cache.api.spec.ts` (`@cache`):
  - Two consecutive `GET /products` with no bypass header → second has
    `X-Cache: hit`.
  - With `Cache-Control: no-cache` → `X-Cache: bypass`.
  - After `/admin/products/:id PATCH` → next list is `X-Cache: miss` (cache
    busted by mutation).
- `tests/e2e/search.e2e.spec.ts` (`@search`):
  - Type into `search-box`, dropdown shows suggestions, arrow-down + Enter
    navigates to product detail.
  - Submitting the form lands on `/search?q=…`; the result count matches
    the API response (via `api.search(q)`).
  - `@i18n` cross-check: switching locale re-renders prices on the search
    results (re-uses Phase 14's invariant — DB row stays USD).
- `tests/e2e/admin-metrics.e2e.spec.ts` (`@metrics @admin`):
  - Admin opens `/admin/metrics`, picks a date range, sees revenue cards
    + top-products table.
  - Cache-state chip toggles `miss` → `hit` on a second load within TTL.

### Tests — perf budget specs

These are the *new layer* and gate CI:

- `tests/perf/lighthouse/routes.perf.spec.ts` (`@perf`) — Lighthouse run +
  budget assertions per route.
- `tests/perf/web-vitals.perf.spec.ts` (`@perf`) — RUM-style CLS/LCP/INP
  capture during a scripted journey on `/`.
- `tests/perf/k6/*.k6.js` — k6 thresholds enforce p95 + error rate.

---

## Definition of Done

- `pnpm db:migrate && pnpm db:seed`, `pnpm build`, `pnpm typecheck`, `pnpm
  lint` all green across the monorepo (no regression in any existing
  phase).
- `pnpm --filter @qa/tests test:feature @search`, `… @recommendations`,
  `… @metrics`, `… @cache` all pass against a freshly seeded DB.
- `pnpm --filter @qa/tests test:sanity` includes `@recommendations @sanity`
  and stays green; the sanity gate grew by one row in `tests/TESTING.md`.
- `pnpm --filter @qa/tests perf:lighthouse` runs all routes in
  `budgets.json` and fails when any budget is breached (verified by a
  smoke test that temporarily bumps a budget down by 50%).
- `pnpm --filter @qa/tests perf:k6` runs all scripts; k6 returns 0 on the
  green run and ≠0 when any threshold is breached.
- `pnpm --filter @qa/tests perf:diff` outputs a markdown table comparing
  the current run against `tests/perf/baselines/latest.json`; baseline
  committed.
- `.github/workflows/perf.yml` runs nightly and on `workflow_dispatch`,
  posts a PR comment with the diff, and uploads results as an artifact.
- README test table grows a "Perf budgets" row; `ARCHITECTURE.md` §6 (file
  map) gains entries for `tests/perf/` and `budgets.json`; `tests/TESTING.md`
  gains the `@perf`, `@search`, `@recommendations`, `@metrics`, `@cache`
  tags + a one-paragraph "Perf as a layer" section linking to
  `tests/perf/README.md`.
- New `tests/perf/README.md` documents: how to run locally, how budgets are
  sized, how to regenerate baselines, and the *locked invariants* above.

## Sub-phases (suggested execution order; each ships independently)

1. **15a — search + suggestions + cache layer** (smallest blast radius).
   Endpoints + web search box + cache header contract + functional specs.
   Lands `@search`, `@cache` tags.
2. **15b — recommendations + bulk-seed seam**. Endpoint, carousel,
   materialized view, `/test/bulk-seed-products`. Lands `@recommendations`
   + `@sanity` row.
3. **15c — admin metrics**. Endpoint + admin page + functional spec.
4. **15d — perf test layer (Lighthouse + web-vitals)**. New project,
   `budgets.json`, route specs. CI nightly job for Lighthouse only.
5. **15e — k6 layer + diff runner + PR comment**. k6 scripts, runner,
   workflow extension. Last because it needs realistic data, which only
   exists after 15a–c.

Each sub-phase has its own Definition of Done subset; collapse into one
phase only if shipping a single PR is preferable.

## Follow-ups (out of scope)

- **Bundle-size budgets** (next-bundle-analyzer) as a separate
  budget axis alongside Lighthouse runtime budgets.
- **Distributed tracing** — OpenTelemetry from the API; correlate slow k6
  requests with API spans.
- **Real Redis** to replace the in-memory LRU; cache-staleness and
  cache-stampede tests would move from "header contract" to "behaviour
  under load".
- **Flamegraph CI artifact** for the slowest endpoint each run.
- **Test impact analysis** — only run perf scripts whose code path changed,
  using `jest --findRelatedTests`-style logic on the API graph.
- **Cross-browser perf** — WebKit and Firefox Lighthouse-equivalents are
  much less mature; left as a follow-up if real demand surfaces.

## Status — ✅ Built (15a–15d; 15e deferred)

- **15a — search + suggestions + cache layer + bulk-seed test seam** — ✅ Built. `Product.searchVector` (`tsvector` + BEFORE-trigger + GIN index) + lower(name) btree shipped via `20260603100000_add_product_search`. `SearchModule` mounts `/products/search` + `/products/suggestions` ahead of `ProductsModule` so the static paths beat `/:id`. In-process `CacheService` + `CacheInterceptor` set `X-Cache: hit | miss | bypass` and honour `Cache-Control: no-cache`; admin product CRUD calls `invalidatePrefix('/products')` so the contract is busted on mutation. `POST /test/bulk-seed-products` is env-guarded by the existing `ENABLE_TEST_ENDPOINTS` flag and is deterministic by RNG seed via `seedBulkProducts`. Web side: `<SearchBox>` in the navbar (debounced 250 ms, arrow-key nav, Enter submits), `/search?q=` page reusing `ProductCard`. Functional specs: `tests/api/search.api.spec.ts` (relevance + headlines + pagination + 400), `tests/api/suggestions.api.spec.ts` (prefix-match + limit clamp + empty 400), `tests/api/cache.api.spec.ts` (miss→hit, bypass, mutation busts), `tests/e2e/search.e2e.spec.ts` (suggestion picking + form submit + empty state). `@search @sanity` added; navbar baselines regenerated. 19/19 `@search|@cache` green; full sanity gate 20/20.
- **15b — recommendations + materialized view** — ✅ Built. New raw migration `20260603120000_add_recommendation_view` creates `RecommendationView` (co-occurrence of `OrderItem × OrderItem` over paid/fulfilled orders) + unique pair index + productA index. `RecommendationsModule` mounts `GET /recommendations` (AuthGuard, X-Recently-Viewed header) and unions collaborative + same-category + recently-viewed signals, dedupes, caps at 12; NOT cached (per-user). New env-gated `POST /test/refresh-recommendation-view` drives view refresh. `RecommendationListSchema` added to `@qa/contracts`. Web: `<Recommendations>` replaces `<RecentlyViewed>` on `/` and `/cart` for authed users (falls back to RecentlyViewed when unauth or empty). `@recommendations @sanity` added. 10/10 `@recommendations` green.
- **15c — admin sales metrics** — ✅ Built. New `metrics.ts` contracts (`SalesMetricsSchema` + sub-schemas) added inline to `@qa/contracts`. `AdminMetricsModule` (under `apps/api/src/admin/metrics/`) mounts `GET /admin/metrics/sales` with AdminGuard, `@Cacheable(30s)` + `CacheInterceptor`, and rejects `from > to` or ranges >1 year. The aggregation is a single raw SQL join over `Order × OrderItem × Product` (revenue-status filter `PAID | FULFILLED`), returning totals + AOV + `byCategory` + top-10 `topProducts`. Admin product CRUD now also calls `invalidatePrefix('/admin/metrics')`. CORS exposes `X-Cache` so the web client can read it. Web: `/admin/metrics` page with date inputs, three cards, top-products + by-category tables, and a debug X-Cache chip; nav-admin link added. `@metrics @sanity` added. 9/9 `@metrics` green; full sanity gate 22/22.
- **15d — Lighthouse + Web Vitals perf layer** — ✅ Built. New `tests/perf/` tree: committed `budgets.json` (LCP/CLS/TBT per route, runner profile `ci-ubuntu-2025-04`), `lighthouse/routes.perf.spec.ts` (one Lighthouse audit per route via `playwright-lighthouse` on `--remote-debugging-port=9222`), `web-vitals.perf.spec.ts` (IIFE inlined from the local `web-vitals` package, scripted journey on `/`, asserts emitted LCP/CLS). New Playwright projects `perf-setup` (bulk-seeds 1000 products idempotently) + `lighthouse-perf` (single-worker, depends on `perf-setup`). New scripts `perf:lighthouse`, `perf:all`. New `.github/workflows/perf.yml` runs nightly (`0 4 * * *` UTC) + on PRs touching SUT/perf paths; uploads Playwright report + test results as 30d artifacts. README + ARCHITECTURE.md + TESTING.md updated; new `tests/perf/README.md`. `@perf` tag added. 10/10 perf-project specs green (5 routes + web-vitals + 4 setup).
- **15e — k6 + perf CI diff runner** — deferred (k6 install not yet available on every dev machine; PR-comment diff runner waits on k6).
