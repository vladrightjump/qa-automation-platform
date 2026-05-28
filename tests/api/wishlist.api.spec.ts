import { test, expect } from '../fixtures';
import { API_BASE } from '../support/api-client';

test.describe('wishlist', () => {
  test('@smoke authed user can add and remove items', async ({
    api,
    testUser,
  }) => {
    let w = await api.getWishlist(testUser.token);
    expect(w.items).toEqual([]);

    w = await api.addToWishlist(testUser.token, 'prod_widget');
    expect(w.items.map((i) => i.productId)).toEqual(['prod_widget']);

    w = await api.removeFromWishlist(testUser.token, 'prod_widget');
    expect(w.items).toEqual([]);
  });

  test('@regression unauthenticated requests return 401', async ({ api }) => {
    const res = await api.raw().get(`${API_BASE}/wishlist`);
    expect(res.status()).toBe(401);
  });

  test('@regression adding the same product twice is idempotent', async ({
    api,
    testUser,
  }) => {
    await api.addToWishlist(testUser.token, 'prod_widget');
    const w = await api.addToWishlist(testUser.token, 'prod_widget');
    expect(w.items.filter((i) => i.productId === 'prod_widget')).toHaveLength(1);
    await api.removeFromWishlist(testUser.token, 'prod_widget');
  });

  test('@regression adding a non-existent product returns 404', async ({
    api,
    testUser,
  }) => {
    const res = await api.raw().post(`${API_BASE}/wishlist/items`, {
      headers: { Authorization: `Bearer ${testUser.token}` },
      data: { productId: 'prod_doesnotexist' },
    });
    expect(res.status()).toBe(404);
  });

  test('@regression invalid productId pattern returns 400', async ({
    api,
    testUser,
  }) => {
    const res = await api.raw().post(`${API_BASE}/wishlist/items`, {
      headers: { Authorization: `Bearer ${testUser.token}` },
      data: { productId: 'NOT-VALID' },
    });
    expect(res.status()).toBe(400);
  });
});
