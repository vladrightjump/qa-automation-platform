import { test, expect } from '../fixtures';
import { API_BASE } from '../support/api-client';
import { AddressFactory } from '../factories/address.factory';
import { ProductFactory } from '../factories/product.factory';

test.describe('addresses', () => {
  test('authed user can CRUD their addresses', { tag: ['@smoke', '@addresses'] }, async ({
    api,
    testUser,
  }) => {
    const created = await api.createAddress(
      testUser.token,
      AddressFactory.build({ label: 'Home', isDefault: true }),
    );
    expect(created.userId).toBe(testUser.id);
    expect(created.isDefault).toBe(true);

    const list = await api.listAddresses(testUser.token);
    expect(list.map((a) => a.id)).toContain(created.id);

    const updated = await api.updateAddress(testUser.token, created.id, {
      label: 'Renamed',
    });
    expect(updated.label).toBe('Renamed');

    await api.deleteAddress(testUser.token, created.id);
    const after = await api.listAddresses(testUser.token);
    expect(after.map((a) => a.id)).not.toContain(created.id);
  });

  test('unauthenticated address access returns 401', { tag: ['@regression', '@addresses', '@security'] }, async ({
    api,
  }) => {
    const res = await api.raw().get(`${API_BASE}/addresses`);
    expect(res.status()).toBe(401);
  });

  test('cannot edit another user’s address (403)', { tag: ['@regression', '@addresses', '@security'] }, async ({
    api,
    testUser,
  }) => {
    const a = await api.createAddress(
      testUser.token,
      AddressFactory.build(),
    );
    // Different user
    const otherCreds = {
      email: `other-${Date.now()}@qa-test.local`,
      password: 'Password123!',
    };
    const other = await api.register(otherCreds.email, otherCreds.password);
    const res = await api.raw().patch(`${API_BASE}/addresses/${a.id}`, {
      headers: { Authorization: `Bearer ${other.token}` },
      data: { label: 'hacked' },
    });
    expect(res.status()).toBe(403);
    await api.deleteAddress(testUser.token, a.id);
  });

  test('setting an address default un-flags the previous default', { tag: ['@regression', '@addresses'] }, async ({
    api,
    testUser,
  }) => {
    const a = await api.createAddress(
      testUser.token,
      AddressFactory.build({ isDefault: true }),
    );
    const b = await api.createAddress(
      testUser.token,
      AddressFactory.build({ isDefault: true }),
    );

    const list = await api.listAddresses(testUser.token);
    const aAfter = list.find((x) => x.id === a.id)!;
    const bAfter = list.find((x) => x.id === b.id)!;
    expect(aAfter.isDefault).toBe(false);
    expect(bAfter.isDefault).toBe(true);
  });

  test('validation rejects empty required fields with 400', { tag: ['@regression', '@addresses', '@edge'] }, async ({
    api,
    testUser,
  }) => {
    const res = await api.raw().post(`${API_BASE}/addresses`, {
      headers: { Authorization: `Bearer ${testUser.token}` },
      data: { label: '', name: '', line1: '', city: '', postalCode: '' },
    });
    expect(res.status()).toBe(400);
  });
});

test.describe('checkout side-effects (DB layer)', () => {
  test('checkout decrements stock, writes audit log, and clears cart', {
    tag: ['@smoke', '@checkout'],
  }, async ({ api, db, testUser }) => {
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 10, priceCents: 2000 }),
    });

    await api.addToCart(testUser.token, product.id, 3);
    const order = await api.checkout(testUser.token);

    const updatedProduct = await db.product.findUniqueOrThrow({
      where: { id: product.id },
    });
    expect(updatedProduct.stock).toBe(7);

    const dbOrder = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(dbOrder.status).toBe('PAID');
    expect(dbOrder.totalCents).toBe(6000);

    const audits = await db.auditLog.findMany({
      where: { entityId: order.id, action: 'ORDER_PAID' },
    });
    expect(audits).toHaveLength(1);
    expect(audits[0]?.entity).toBe('Order');
    expect(audits[0]?.userId).toBe(testUser.id);

    const cartItems = await db.cartItem.findMany({
      where: { cart: { userId: testUser.id } },
    });
    expect(cartItems).toHaveLength(0);
    const cart = await db.cart.findUnique({ where: { userId: testUser.id } });
    expect(cart).not.toBeNull();
  });

  test('checkout is transactional — failure rolls back stock', {
    tag: ['@regression', '@checkout', '@negative'],
  }, async ({ api, db, testUser }) => {
    const ok = await db.product.create({
      data: ProductFactory.build({ stock: 5, priceCents: 1000 }),
    });
    const willFail = await db.product.create({
      data: ProductFactory.build({ stock: 5, priceCents: 1000 }),
    });

    await api.addToCart(testUser.token, ok.id, 2);
    await api.addToCart(testUser.token, willFail.id, 2);

    await db.product.update({
      where: { id: willFail.id },
      data: { stock: 0 },
    });

    let failed = false;
    try {
      await api.checkout(testUser.token);
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);

    const okAfter = await db.product.findUniqueOrThrow({ where: { id: ok.id } });
    expect(okAfter.stock).toBe(5);
    const audits = await db.auditLog.findMany({
      where: { userId: testUser.id, action: 'ORDER_PAID' },
    });
    expect(audits).toHaveLength(0);
  });
});
