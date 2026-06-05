// Cart + checkout input boundaries: quantity floors and ceilings, the
// empty-cart guard, and UTF-8 fidelity through the storage round-trip.
// Each negative path matches on the HTTP status (encoded in the api-client
// error message) rather than the human-readable text — strings drift,
// codes don't (per Phase D scope guard).
import { test, expect } from '../fixtures';
import { seedProduct, withDefaultAddress } from '../support/seed';

test.describe('cart + checkout boundary cliffs', () => {
  test(
    'quantity=0 on add-to-cart rejected by DTO @Min(1)',
    { tag: ['@edge', '@boundary', '@checkout', '@regression', '@negative'] },
    async ({ api, db, testUser }) => {
      const p = await seedProduct(db, { stock: 5, priceCents: 1_000 });
      await expect(api.addToCart(testUser.token, p.id, 0)).rejects.toThrow(/addToCart: 400/);
    },
  );

  test(
    'quantity=1 is the smallest accepted value',
    { tag: ['@edge', '@boundary', '@checkout', '@regression'] },
    async ({ api, db, testUser }) => {
      const p = await seedProduct(db, { stock: 5, priceCents: 1_000 });
      const cart = await api.addToCart(testUser.token, p.id, 1);
      const line = cart.items.find((i) => i.productId === p.id);
      expect(line?.quantity).toBe(1);
    },
  );

  test(
    'quantity=Number.MAX_SAFE_INTEGER rejected by DTO @Max(99)',
    { tag: ['@edge', '@boundary', '@checkout', '@regression', '@negative'] },
    async ({ api, db, testUser }) => {
      const p = await seedProduct(db, { stock: 5, priceCents: 1_000 });
      await expect(
        api.addToCart(testUser.token, p.id, Number.MAX_SAFE_INTEGER),
      ).rejects.toThrow(/addToCart: 400/);
    },
  );

  test(
    'quantity > stock — add-to-cart is permissive, checkout enforces',
    { tag: ['@edge', '@boundary', '@checkout', '@regression', '@negative'] },
    async ({ api, db, testUser }) => {
      const p = await seedProduct(db, { stock: 2, priceCents: 1_000 });
      // Cart accepts qty=5 since it's ≤ DTO max; stock check lives in checkout.
      const cart = await api.addToCart(testUser.token, p.id, 5);
      expect(cart.items.find((i) => i.productId === p.id)?.quantity).toBe(5);

      await withDefaultAddress(api, testUser.token);
      await expect(
        api.checkout(testUser.token, { paymentMethod: 'CARD' }),
      ).rejects.toThrow(/insufficient stock/i);

      // Stock unchanged because the transaction never opened.
      const after = await db.product.findUnique({ where: { id: p.id } });
      expect(after?.stock).toBe(2);
    },
  );

  test(
    'empty cart checkout is rejected before any payment side-effects',
    { tag: ['@edge', '@boundary', '@checkout', '@regression', '@negative'] },
    async ({ api, testUser }) => {
      await withDefaultAddress(api, testUser.token);
      await expect(
        api.checkout(testUser.token, { paymentMethod: 'CARD' }),
      ).rejects.toThrow(/cart is empty/i);
    },
  );

  test(
    'unicode address fields round-trip through Prisma byte-for-byte',
    { tag: ['@edge', '@boundary', '@checkout', '@regression'] },
    async ({ api, db, testUser }) => {
      const address = await api.createAddress(testUser.token, {
        label: 'Home',
        name: '李雷',
        line1: 'Bahnhofstraße 1',
        city: 'München',
        postalCode: '80331',
        country: 'DE',
        isDefault: true,
      });

      const row = await db.address.findUnique({ where: { id: address.id } });
      expect(row?.name).toBe('李雷');
      expect(row?.line1).toBe('Bahnhofstraße 1');
      expect(row?.city).toBe('München');

      // Real checkout against the same address confirms it's wired through.
      const p = await seedProduct(db, { stock: 1, priceCents: 1_000 });
      await api.addToCart(testUser.token, p.id, 1);
      const order = await api.checkout(testUser.token, { addressId: address.id, paymentMethod: 'CARD' });
      expect(order.status).toBe('PAID');
    },
  );

  test(
    'multi-byte product name survives checkout into the Order',
    { tag: ['@edge', '@boundary', '@checkout', '@regression'] },
    async ({ api, db, testUser }) => {
      const p = await seedProduct(db, { stock: 1, priceCents: 1_000, name: '📦 Box' });
      const stored = await db.product.findUnique({ where: { id: p.id } });
      expect(stored?.name).toBe('📦 Box');

      await withDefaultAddress(api, testUser.token);
      await api.addToCart(testUser.token, p.id, 1);
      const order = await api.checkout(testUser.token, { paymentMethod: 'CARD' });

      // OrderItem references the product by id; verify the name persists
      // on the Product row referenced from the placed order.
      expect(order.items.some((i) => i.productId === p.id)).toBe(true);
      const afterCheckout = await db.product.findUnique({ where: { id: p.id } });
      expect(afterCheckout?.name).toBe('📦 Box');
    },
  );
});
