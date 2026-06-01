import { test, expect } from '../fixtures';
import { API_BASE } from '../support/api-client';
import { AddressFactory } from '../factories/address.factory';
import { ProductFactory } from '../factories/product.factory';

test.describe('checkout with promo + address', () => {
  test('applying WELCOME10 reduces order total by 10%', { tag: ['@smoke', '@checkout'] }, async ({
    api,
    db,
    testUser,
  }) => {
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 5, priceCents: 10_000 }),
    });
    const address = await api.createAddress(
      testUser.token,
      AddressFactory.build({ isDefault: true }),
    );
    await api.addToCart(testUser.token, product.id, 2);

    const preview = await api.applyPromo(testUser.token, 'WELCOME10');
    expect(preview.discountCents).toBe(2_000); // 10% of 20_000

    const order = await api.checkout(testUser.token, {
      addressId: address.id,
      paymentMethod: 'CARD',
      promoCode: 'WELCOME10',
    });
    expect(order.totalCents).toBe(18_000);
    expect(order.discountCents).toBe(2_000);
    expect(order.shippingAddressId).toBe(address.id);
    expect(order.paymentMethod).toBe('CARD');
  });

  test('FREESHIP applies flat $5 off', { tag: ['@regression', '@checkout'] }, async ({
    api,
    db,
    testUser,
  }) => {
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 5, priceCents: 3_000 }),
    });
    const addr = await api.createAddress(
      testUser.token,
      AddressFactory.build(),
    );
    await api.addToCart(testUser.token, product.id, 1);

    const order = await api.checkout(testUser.token, {
      addressId: addr.id,
      promoCode: 'FREESHIP',
    });
    expect(order.discountCents).toBe(500);
    expect(order.totalCents).toBe(2_500);
  });

  test('unknown promo code returns 404', { tag: ['@regression', '@checkout'] }, async ({
    api,
    testUser,
    db,
  }) => {
    const p = await db.product.create({
      data: ProductFactory.build({ stock: 1, priceCents: 1000 }),
    });
    await api.addToCart(testUser.token, p.id, 1);
    const res = await api.raw().post(`${API_BASE}/promo-codes/apply`, {
      headers: { Authorization: `Bearer ${testUser.token}` },
      data: { code: 'NOPE' },
    });
    expect(res.status()).toBe(404);
  });

  test('expired promo (OLDDEAL) returns 400', { tag: ['@regression', '@checkout'] }, async ({
    api,
    testUser,
    db,
  }) => {
    const p = await db.product.create({
      data: ProductFactory.build({ stock: 1, priceCents: 1000 }),
    });
    await api.addToCart(testUser.token, p.id, 1);
    const res = await api.raw().post(`${API_BASE}/promo-codes/apply`, {
      headers: { Authorization: `Bearer ${testUser.token}` },
      data: { code: 'OLDDEAL' },
    });
    expect(res.status()).toBe(400);
  });

  test('checkout with addressId belonging to another user returns 400', { tag: ['@regression', '@checkout'] }, async ({
    api,
    testUser,
    db,
  }) => {
    // Create address as testUser
    const myAddress = await api.createAddress(
      testUser.token,
      AddressFactory.build(),
    );
    // Different user
    const other = await api.register(
      `other-${Date.now()}@qa-test.local`,
      'Password123!',
    );
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 5, priceCents: 1000 }),
    });
    await api.addToCart(other.token, product.id, 1);

    const res = await api.raw().post(`${API_BASE}/orders`, {
      headers: { Authorization: `Bearer ${other.token}` },
      data: { addressId: myAddress.id, paymentMethod: 'CARD' },
    });
    expect(res.status()).toBe(400);
  });
});
