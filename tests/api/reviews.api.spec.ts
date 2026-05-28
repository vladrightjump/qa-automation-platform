import { test, expect } from '../fixtures';
import { API_BASE } from '../support/api-client';
import { ProductFactory } from '../factories/product.factory';

test.describe('reviews', () => {
  test('@smoke authed user can post a review; summary reflects average', async ({
    api,
    db,
    testUser,
  }) => {
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 5, priceCents: 1000 }),
    });

    await api.createReview(testUser.token, product.id, {
      rating: 4,
      title: 'Solid',
      body: 'Worked as expected.',
    });

    const list = await api.listReviews(product.id);
    expect(list.total).toBe(1);
    expect(list.items[0]?.rating).toBe(4);
    expect(list.averageRating).toBe(4);

    const summary = await api.reviewSummary(product.id);
    expect(summary.reviewCount).toBe(1);
    expect(summary.averageRating).toBe(4);
  });

  test('@regression unauthenticated post returns 401', async ({ api }) => {
    const res = await api.raw().post(
      `${API_BASE}/products/prod_widget/reviews`,
      { data: { rating: 5, title: 'x', body: 'y' } },
    );
    expect(res.status()).toBe(401);
  });

  test('@regression rating out of range rejected with 400', async ({
    api,
    testUser,
    db,
  }) => {
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 1, priceCents: 100 }),
    });
    const res = await api.raw().post(
      `${API_BASE}/products/${product.id}/reviews`,
      {
        headers: { Authorization: `Bearer ${testUser.token}` },
        data: { rating: 6, title: 'x', body: 'y' },
      },
    );
    expect(res.status()).toBe(400);
  });

  test('@regression duplicate review by same user returns 409', async ({
    api,
    testUser,
    db,
  }) => {
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 1, priceCents: 100 }),
    });
    await api.createReview(testUser.token, product.id, {
      rating: 5,
      title: 'a',
      body: 'b',
    });
    const res = await api.raw().post(
      `${API_BASE}/products/${product.id}/reviews`,
      {
        headers: { Authorization: `Bearer ${testUser.token}` },
        data: { rating: 4, title: 'a', body: 'c' },
      },
    );
    expect(res.status()).toBe(409);
  });

  test('@regression sort=highest puts top rating first', async ({
    api,
    db,
  }) => {
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 1, priceCents: 100 }),
    });
    // Three reviews from three distinct users — register inline.
    const cases: [number, number][] = [
      [1, 3],
      [2, 5],
      [3, 4],
    ];
    for (const [i, r] of cases) {
      const auth = await api.register(
        `reviewer-${product.id}-${i}@qa-test.local`,
        'Password123!',
      );
      await api.createReview(auth.token, product.id, {
        rating: r,
        title: `r${i}`,
        body: `b${i}`,
      });
    }
    const list = await api.listReviews(product.id, { sort: 'highest' });
    expect(list.items.map((r) => r.rating)).toEqual([5, 4, 3]);
  });

  test('@regression cannot delete someone else’s review (403)', async ({
    api,
    testUser,
    db,
  }) => {
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 1, priceCents: 100 }),
    });
    const review = await api.createReview(testUser.token, product.id, {
      rating: 5,
      title: 'a',
      body: 'b',
    });
    const other = await api.register(
      `other-${Date.now()}@qa-test.local`,
      'Password123!',
    );
    const res = await api.raw().delete(`${API_BASE}/reviews/${review.id}`, {
      headers: { Authorization: `Bearer ${other.token}` },
    });
    expect(res.status()).toBe(403);
  });
});
