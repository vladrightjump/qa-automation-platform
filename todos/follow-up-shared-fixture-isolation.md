# Follow-up: shared-fixture isolation for parallel Playwright runs

## Context

Updating the e2e suite for the Arden redesign exposed a handful of
pre-existing flakes that have the same root cause: tests share the
seeded product catalog (`prod_widget`, `prod_gizmo`, etc.) and the
recommendation materialized view, and parallel suites step on each
other's state.

The Arden test-update PR
(`refactor: test/arden-e2e-update → main`) fixed the design-driven
failures and added per-test stock top-ups in the four highest-traffic
specs (admin-metrics, recommendations, browse, network-mocking,
wishlist). The remainder is a fixture-hardening pass and belongs in a
dedicated PR.

## Failures still flaky on a full `pnpm playwright test`

Each one passes in isolation; only the parallel run reproduces them.

1. **`api/metrics.api.spec.ts:16`** — "admin gets contract-valid
   metrics and they reflect a fresh paid order". Asserts the revenue
   delta after placing one paid order. Other specs running in the
   same window also place paid orders against `prod_widget`, so the
   delta this test reads back isn't the one it created.

2. **`api/recommendations.api.spec.ts:13`** — "returns a contract-
   valid list with at least one same-category rec after a paid order".
   Calls `api.refreshRecommendationView()` then asserts the
   recommendation list is non-empty. The materialized view can be
   refreshed in between by parallel specs and lose the row this test
   needs to see.

3. **`api/recommendations.api.spec.ts:55`** — "response is deduped —
   no product appears twice across kinds". Same materialized-view
   race; the dedup invariant only holds within a single coherent
   snapshot.

4. **`api/recommendations.api.spec.ts:73`** — "collaborative signal
   reflects co-purchases in the materialized view". Same as :13 plus
   it depends on co-purchase pairs that other parallel checkouts can
   shift.

5. **`e2e/admin-metrics.e2e.spec.ts:31`** — "dev-only X-Cache chip
   toggles miss → hit on consecutive submits". Reads the
   `X-Cache: MISS` header on first request then expects `HIT` on
   the second. A parallel test invalidating the metrics cache
   between the two submits forces a second MISS.

## Suspected root causes

- **Shared seeded products with finite stock.** Every spec uses
  the same `prod_widget` (seeded with stock 50). Cart/checkout
  specs decrement it; later specs see stock 0 and either fail to
  add or render a disabled button. The Arden test-update PR added
  `db.product.update` top-ups in five specs as a stopgap.
- **Materialized recommendation view.** Recommendation specs call
  `api.refreshRecommendationView()` then assert against the view.
  Concurrent specs can refresh again or place orders that change
  the view's contents.
- **Shared metrics cache (CacheService).** `admin-metrics:31` reads
  `X-Cache` header transitions; other specs that hit the same
  cache key reset it between the two requests this test makes.

## Suggested fixes (in order of cost)

1. **Per-test product factories.** Make every test that does
   checkout call `AdminProductFactory.build()` (already exists in
   `tests/factories/admin-product.factory.ts`) and use the freshly
   created product rather than `prod_widget`. Five specs to update;
   highest payoff per line.

2. **Recommendation-view fixture.** Add a `recommendationView`
   fixture in `tests/fixtures/index.ts` that wraps each test in a
   short critical section: refresh the view then immediately read,
   with retry on transient empty results.

3. **Per-test cache-key namespace.** Make the metrics cache key
   include `req.testRunId` (or similar) so parallel specs don't
   share entries. Out of scope for a test-only pass; needs an API
   change.

4. **Sequential `@flaky` project.** Add a Playwright project that
   runs just these five specs with `workers: 1`. Cheap, hides the
   problem rather than fixes it.

## Out of scope here

The five failures above. They aren't redesign-related and shouldn't
block the Arden test-update PR from merging. They predate Arden — the
audit at the start of the test-update work flagged them explicitly
as "CI flakes, not redesign-related" and the user agreed to defer.

When you pick this up next: start with fix (1) above (per-test
product factories) — it tackles 3 of the 5 failures (metrics:16,
recommendations:13/73) and removes the stock top-ups the Arden PR
added as workarounds.
