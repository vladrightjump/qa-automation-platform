// Phase 15b — recommendations API. Three signals are unioned per call:
//   collaborative   — RecommendationView co-occurrences for the user's paid items
//   same-category   — categories from the user's most-recent paid order
//   recently-viewed — same-category seeds from the X-Recently-Viewed header
//
// The materialized view is refreshed via the env-gated test seam
// (POST /test/refresh-recommendation-view) after a fresh paid order so the
// collaborative signal reflects the test's setup.
import { test, expect } from '../fixtures';
import { RecommendationListSchema } from '@qa/contracts';

test.describe('recommendations (API)', () => {
  test('returns a contract-valid list with at least one same-category rec after a paid order', {
    tag: ['@sanity', '@regression', '@recommendations'],
  }, async ({ api, testUser }) => {
    // Setup: user buys a gadgets item. The most-recent paid order's
    // categories drive the same-category signal.
    await api.addToCart(testUser.token, 'prod_widget', 1);
    await api.addToCart(testUser.token, 'prod_gizmo', 1);
    await api.checkout(testUser.token, { paymentMethod: 'CARD' });
    await api.refreshRecommendationView();

    const recs = await api.getRecommendations(testUser.token);
    expect(recs).toMatchContract(RecommendationListSchema);
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.length).toBeLessThanOrEqual(12);

    // At least one same-category rec from gadgets (and not one of the
    // products the user just bought).
    const sameCat = recs.filter((r) => r.kind === 'same-category');
    expect(sameCat.length).toBeGreaterThan(0);
    for (const rec of sameCat) {
      expect(rec.product.category).toBe('gadgets');
      expect(['prod_widget', 'prod_gizmo']).not.toContain(rec.product.id);
    }
  });

  test('honours the X-Recently-Viewed header for unauthed-history seeding', {
    tag: ['@regression', '@recommendations'],
  }, async ({ api, testUser }) => {
    // No purchases yet → only recently-viewed should fire.
    const recs = await api.getRecommendations(testUser.token, [
      'prod_tee_basic',
      'prod_hoodie_classic',
    ]);
    expect(recs).toMatchContract(RecommendationListSchema);
    const rvRecs = recs.filter((r) => r.kind === 'recently-viewed');
    expect(rvRecs.length).toBeGreaterThan(0);
    for (const rec of rvRecs) {
      expect(rec.product.category).toBe('apparel');
      expect(['prod_tee_basic', 'prod_hoodie_classic']).not.toContain(rec.product.id);
    }
  });

  test('response is deduped — no product appears twice across kinds', {
    tag: ['@regression', '@recommendations'],
  }, async ({ api, testUser }) => {
    await api.addToCart(testUser.token, 'prod_widget', 1);
    await api.checkout(testUser.token, { paymentMethod: 'CARD' });
    await api.refreshRecommendationView();
    const recs = await api.getRecommendations(testUser.token, ['prod_gizmo']);
    const ids = recs.map((r) => r.product.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('unauthenticated → 401', {
    tag: ['@regression', '@recommendations', '@security'],
  }, async ({ api }) => {
    const res = await api.getRecommendationsRaw(undefined);
    expect(res.status()).toBe(401);
  });

  test('collaborative signal reflects co-purchases in the materialized view', {
    tag: ['@regression', '@recommendations'],
  }, async ({ api, testUser, db }) => {
    await api.addToCart(testUser.token, 'prod_widget', 1);
    await api.addToCart(testUser.token, 'prod_gizmo', 1);
    await api.checkout(testUser.token, { paymentMethod: 'CARD' });
    await api.refreshRecommendationView();

    const recs = await api.getRecommendations(testUser.token);
    const collab = recs.filter((r) => r.kind === 'collaborative');

    // The view may be empty if the only co-purchase is this user's own
    // (already excluded). If it has rows, each collab product must appear
    // in the view as a B-side for one of the user's purchases.
    if (collab.length > 0) {
      const rows = await db.$queryRawUnsafe<Array<{ productBId: string }>>(
        `SELECT "productBId" FROM "RecommendationView" WHERE "productAId" IN ('prod_widget','prod_gizmo')`,
      );
      const ids = new Set(rows.map((r) => r.productBId));
      for (const rec of collab) {
        expect(ids.has(rec.product.id)).toBe(true);
      }
    }
  });
});
