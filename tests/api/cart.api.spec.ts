import { test, expect } from '../fixtures';
import { CartSchema } from '@qa/contracts';
import { API_BASE } from '../api-clients';

test.describe('cart', () => {
  test('GET /cart without token returns 401', { tag: ['@regression', '@cart', '@security'] }, async ({ api }) => {
    const res = await api.raw().get(`${API_BASE}/cart`);
    expect(res.status()).toBe(401);
  });

  test('add item: cart returns the line with computed product details', { tag: ['@smoke', '@cart'] }, async ({
    api,
    testUser,
  }) => {
    const cart = await api.cart.addItem(testUser.token, 'prod_widget', 2);
    expect(CartSchema.safeParse(cart).success).toBe(true);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]?.productId).toBe('prod_widget');
    expect(cart.items[0]?.quantity).toBe(2);
    expect(cart.items[0]?.product.priceCents).toBe(1999);
  });

  test('adding the same product twice increments quantity', { tag: ['@regression', '@cart'] }, async ({
    api,
    testUser,
  }) => {
    await api.cart.addItem(testUser.token, 'prod_widget', 1);
    const cart = await api.cart.addItem(testUser.token, 'prod_widget', 3);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]?.quantity).toBe(4);
  });

  test('add unknown product returns 404', { tag: ['@regression', '@cart', '@negative'] }, async ({ api, testUser }) => {
    const res = await api.raw().post(`${API_BASE}/cart/items`, {
      headers: { Authorization: `Bearer ${testUser.token}` },
      data: { productId: 'prod_nope', quantity: 1 },
    });
    expect(res.status()).toBe(404);
  });

  test('invalid quantity (zero) returns 400', { tag: ['@regression', '@cart', '@edge'] }, async ({ api, testUser }) => {
    const res = await api.raw().post(`${API_BASE}/cart/items`, {
      headers: { Authorization: `Bearer ${testUser.token}` },
      data: { productId: 'prod_widget', quantity: 0 },
    });
    expect(res.status()).toBe(400);
  });

  test('remove item drops that line', { tag: ['@regression', '@cart'] }, async ({ api, testUser }) => {
    await api.cart.addItem(testUser.token, 'prod_widget', 1);
    const cart = await api.cart.removeItem(testUser.token, 'prod_widget');
    expect(cart.items.find((i) => i.productId === 'prod_widget')).toBeUndefined();
  });
});
