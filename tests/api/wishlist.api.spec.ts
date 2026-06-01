import { test, expect } from '../fixtures';
import { API_BASE } from '../support/api-client';

test.describe('wishlist', () => {
  test('authed user can add and remove items', { tag: ['@smoke', '@wishlist'] }, async ({
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

  test('unauthenticated requests return 401', { tag: ['@regression', '@wishlist'] }, async ({ api }) => {
    const res = await api.raw().get(`${API_BASE}/wishlist`);
    expect(res.status()).toBe(401);
  });

  test('adding the same product twice is idempotent', { tag: ['@regression', '@wishlist'] }, async ({
    api,
    testUser,
  }) => {
    await api.addToWishlist(testUser.token, 'prod_widget');
    const w = await api.addToWishlist(testUser.token, 'prod_widget');
    expect(w.items.filter((i) => i.productId === 'prod_widget')).toHaveLength(1);
    await api.removeFromWishlist(testUser.token, 'prod_widget');
  });

  test('adding a non-existent product returns 404', { tag: ['@regression', '@wishlist'] }, async ({
    api,
    testUser,
  }) => {
    const res = await api.raw().post(`${API_BASE}/wishlist/items`, {
      headers: { Authorization: `Bearer ${testUser.token}` },
      data: { productId: 'prod_doesnotexist' },
    });
    expect(res.status()).toBe(404);
  });

  test('invalid productId pattern returns 400', { tag: ['@regression', '@wishlist'] }, async ({
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
