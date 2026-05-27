// DB-layer assertions: things the API doesn't return in the checkout response.
// The whole point of this project is verifying these *hidden* side-effects
// with the same Prisma client the API uses.
import { test, expect } from '../fixtures';
import { ProductFactory } from '../factories/product.factory';

test.describe('checkout side-effects (DB layer)', () => {
  test('@smoke checkout decrements stock, writes audit log, and clears cart', async ({
    api,
    db,
    testUser,
  }) => {
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 10, priceCents: 2000 }),
    });

    await api.addToCart(testUser.token, product.id, 3);
    const order = await api.checkout(testUser.token);

    // 1) stock decremented (10 → 7) — invisible in API response
    const updatedProduct = await db.product.findUniqueOrThrow({
      where: { id: product.id },
    });
    expect(updatedProduct.stock).toBe(7);

    // 2) order status PAID — visible in response, doubled-checked in DB
    const dbOrder = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(dbOrder.status).toBe('PAID');
    expect(dbOrder.totalCents).toBe(6000);

    // 3) audit log row — entirely invisible to the API surface
    const audits = await db.auditLog.findMany({
      where: { entityId: order.id, action: 'ORDER_PAID' },
    });
    expect(audits).toHaveLength(1);
    expect(audits[0]?.entity).toBe('Order');
    expect(audits[0]?.userId).toBe(testUser.id);
    expect(audits[0]?.metadata).toMatchObject({
      totalCents: 6000,
      itemCount: 1,
    });

    // 4) cart items cleared, but the Cart row itself is preserved
    const cartItems = await db.cartItem.findMany({
      where: { cart: { userId: testUser.id } },
    });
    expect(cartItems).toHaveLength(0);
    const cart = await db.cart.findUnique({ where: { userId: testUser.id } });
    expect(cart).not.toBeNull();
  });

  test('@regression checkout is transactional — failure rolls back stock', async ({
    api,
    db,
    testUser,
  }) => {
    // Two products: one normal, one we'll force out-of-stock between addToCart and checkout
    const ok = await db.product.create({
      data: ProductFactory.build({ stock: 5, priceCents: 1000 }),
    });
    const willFail = await db.product.create({
      data: ProductFactory.build({ stock: 5, priceCents: 1000 }),
    });

    await api.addToCart(testUser.token, ok.id, 2);
    await api.addToCart(testUser.token, willFail.id, 2);

    // Race the API by dropping stock to zero behind its back.
    await db.product.update({
      where: { id: willFail.id },
      data: { stock: 0 },
    });

    // Checkout should fail because the conditional decrement on `willFail` 0-rows.
    let failed = false;
    try {
      await api.checkout(testUser.token);
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);

    // Critically: `ok` stock is NOT decremented — the txn rolled back.
    const okAfter = await db.product.findUniqueOrThrow({ where: { id: ok.id } });
    expect(okAfter.stock).toBe(5);
    // No audit log row written.
    const audits = await db.auditLog.findMany({
      where: { userId: testUser.id, action: 'ORDER_PAID' },
    });
    expect(audits).toHaveLength(0);
  });
});
