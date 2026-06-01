import { test, expect } from '../fixtures';
import { API_BASE } from '../support/api-client';
import { ProductFactory } from '../factories/product.factory';

test.describe('cart quantity + reorder', () => {
  test('updateCartItem clamps quantity to product stock', { tag: ['@smoke', '@cart'] }, async ({
    api,
    db,
    testUser,
  }) => {
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 3, priceCents: 100 }),
    });
    await api.addToCart(testUser.token, product.id, 1);

    // Asking for 99 clamps to stock=3.
    const cart = await api.updateCartItem(testUser.token, product.id, 99);
    const item = cart.items.find((i) => i.productId === product.id);
    expect(item?.quantity).toBe(3);
  });

  test('updating quantity below 1 is rejected with 400', { tag: ['@regression', '@cart'] }, async ({
    api,
    testUser,
    db,
  }) => {
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 5, priceCents: 100 }),
    });
    await api.addToCart(testUser.token, product.id, 1);
    const res = await api.raw().patch(
      `${API_BASE}/cart/items/${product.id}`,
      {
        headers: { Authorization: `Bearer ${testUser.token}` },
        data: { quantity: 0 },
      },
    );
    expect(res.status()).toBe(400);
  });

  test('reorder updates item order in the response', { tag: ['@regression', '@cart'] }, async ({
    api,
    db,
    testUser,
  }) => {
    const a = await db.product.create({
      data: ProductFactory.build({ stock: 5, priceCents: 100 }),
    });
    const b = await db.product.create({
      data: ProductFactory.build({ stock: 5, priceCents: 200 }),
    });
    const c = await db.product.create({
      data: ProductFactory.build({ stock: 5, priceCents: 300 }),
    });
    await api.addToCart(testUser.token, a.id, 1);
    await api.addToCart(testUser.token, b.id, 1);
    await api.addToCart(testUser.token, c.id, 1);

    const cart = await api.reorderCart(testUser.token, [c.id, a.id, b.id]);
    expect(cart.items.map((i) => i.productId)).toEqual([c.id, a.id, b.id]);
  });

  test('reorder with missing item is rejected with 400', { tag: ['@regression', '@cart'] }, async ({
    api,
    db,
    testUser,
  }) => {
    const a = await db.product.create({
      data: ProductFactory.build({ stock: 5, priceCents: 100 }),
    });
    const b = await db.product.create({
      data: ProductFactory.build({ stock: 5, priceCents: 200 }),
    });
    await api.addToCart(testUser.token, a.id, 1);
    await api.addToCart(testUser.token, b.id, 1);
    const res = await api.raw().patch(`${API_BASE}/cart/reorder`, {
      headers: { Authorization: `Bearer ${testUser.token}` },
      data: { order: [a.id] }, // missing b
    });
    expect(res.status()).toBe(400);
  });
});
