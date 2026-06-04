-- Phase 15b: collaborative-filtering signal for /recommendations.
--
-- A materialized view counts how often each pair of products has been
-- bought together (same order). The recommendations service joins this
-- against the user's recent purchases to surface "users who bought X also
-- bought Y". Filtered to PAID/FULFILLED orders only so unpaid intents
-- don't pollute the signal.
--
-- Refresh is driven by POST /test/refresh-recommendation-view (env-gated)
-- after bulk seeding; in production it would be a cron/background job.
-- The view is intentionally non-CONCURRENT (no unique index requirement
-- besides the one below) so REFRESH is fast on the test SUT.

CREATE MATERIALIZED VIEW "RecommendationView" AS
SELECT
  a."productId"     AS "productAId",
  b."productId"     AS "productBId",
  count(*)::int     AS "coOccurrenceCount"
FROM "OrderItem" a
JOIN "OrderItem" b
  ON a."orderId" = b."orderId"
 AND a."productId" <> b."productId"
JOIN "Order" o
  ON o.id = a."orderId"
WHERE o.status IN ('PAID', 'FULFILLED')
GROUP BY a."productId", b."productId";

CREATE UNIQUE INDEX "RecommendationView_pair_idx"
  ON "RecommendationView" ("productAId", "productBId");

CREATE INDEX "RecommendationView_productA_idx"
  ON "RecommendationView" ("productAId");
