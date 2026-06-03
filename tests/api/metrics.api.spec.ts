// Phase 15c — admin sales metrics. Single aggregation over Order × OrderItem
// × Product. Admin-only; cached for 30s and busted by admin product mutations.
import { test, expect } from '../fixtures';
import { SalesMetricsSchema } from '@qa/contracts';
import { ProductFactory } from '../factories/product.factory';

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function uniqueProductId(prefix: string): string {
  return `prod_${prefix}_${Date.now()}_${Math.floor(Math.random() * 10_000)}`;
}

test.describe('admin sales metrics (API)', () => {
  test('admin gets contract-valid metrics and they reflect a fresh paid order', {
    tag: ['@sanity', '@regression', '@metrics', '@admin'],
  }, async ({ api, adminUser, testUser, db }) => {
    const from = isoDaysAgo(1);
    const to = new Date(Date.now() + 60_000).toISOString();

    // Snapshot before so we can assert the delta after a paid order.
    const before = await api.adminGetSalesMetrics(adminUser.token, { from, to });
    expect(before).toMatchContract(SalesMetricsSchema);

    // Place a paid order from a fresh user. priceCents come from the seeded
    // catalog and end up frozen on OrderItem.unitPriceCents.
    await api.addToCart(testUser.token, 'prod_widget', 2);
    await api.addToCart(testUser.token, 'prod_gizmo', 1);
    const order = await api.checkout(testUser.token, { paymentMethod: 'CARD' });

    // Force a fresh read — the previous call cached the empty totals.
    const after = await api.adminGetSalesMetricsRaw(
      adminUser.token,
      { from, to },
      { 'Cache-Control': 'no-cache' },
    );
    expect(after.headers()['x-cache']).toBe('bypass');
    const data = SalesMetricsSchema.parse(await after.json());

    // Other parallel tests may also place paid orders in this same window,
    // so we assert that the delta covers AT LEAST this test's contribution.
    expect(data.orderCount).toBeGreaterThanOrEqual(before.orderCount + 1);
    expect(data.totalRevenueCents).toBeGreaterThanOrEqual(
      before.totalRevenueCents + order.totalCents,
    );

    // Cross-check against the DB scoped to *this* user's orders so
    // parallel writes from other specs don't move the goalpost. The API's
    // total (all users in the window) must cover this user's slice.
    const rows = await db.$queryRawUnsafe<Array<{ sum: bigint }>>(
      `SELECT COALESCE(SUM(oi.quantity * oi."unitPriceCents"), 0)::bigint AS sum
       FROM "Order" o
       JOIN "OrderItem" oi ON oi."orderId" = o.id
       WHERE o.status IN ('PAID', 'FULFILLED')
         AND o."userId" = $1
         AND o."createdAt" >= $2::timestamptz
         AND o."createdAt" <= $3::timestamptz`,
      testUser.id,
      from,
      to,
    );
    const userSliceCents = Number(rows[0]!.sum);
    expect(userSliceCents).toBe(order.totalCents);
    expect(data.totalRevenueCents).toBeGreaterThanOrEqual(userSliceCents);
  });

  test('USER token → 403, unauth → 401', {
    tag: ['@regression', '@metrics', '@admin'],
  }, async ({ api, testUser }) => {
    const forbidden = await api.adminGetSalesMetricsRaw(testUser.token);
    expect(forbidden.status()).toBe(403);
    const unauth = await api.adminGetSalesMetricsRaw(undefined);
    expect(unauth.status()).toBe(401);
  });

  test('from > to → 400', {
    tag: ['@regression', '@metrics', '@admin'],
  }, async ({ api, adminUser }) => {
    const res = await api.adminGetSalesMetricsRaw(adminUser.token, {
      from: isoDaysAgo(1),
      to: isoDaysAgo(30),
    });
    expect(res.status()).toBe(400);
  });

  test('range longer than 1 year → 400', {
    tag: ['@regression', '@metrics', '@admin'],
  }, async ({ api, adminUser }) => {
    const res = await api.adminGetSalesMetricsRaw(adminUser.token, {
      from: isoDaysAgo(400),
      to: new Date().toISOString(),
    });
    expect(res.status()).toBe(400);
  });

  test('X-Cache contract: miss → hit, and admin product mutation busts the cache', {
    tag: ['@regression', '@metrics', '@cache', '@admin'],
  }, async ({ api, adminUser }) => {
    // Unique range so this spec doesn't share a cache entry with siblings.
    const from = new Date(Date.now() - (5 * 86_400_000 + Date.now() % 1000)).toISOString();
    const to = new Date().toISOString();

    const r1 = await api.adminGetSalesMetricsRaw(adminUser.token, { from, to });
    expect(r1.headers()['x-cache']).toBe('miss');
    const r2 = await api.adminGetSalesMetricsRaw(adminUser.token, { from, to });
    expect(r2.headers()['x-cache']).toBe('hit');

    // Mutate the catalog via admin → next call is a miss.
    const id = uniqueProductId('metrics_bust');
    const factory = ProductFactory.build({ stock: 1 });
    await api.adminCreateProduct(adminUser.token, {
      id,
      name: factory.name,
      description: factory.description,
      priceCents: factory.priceCents,
      stock: factory.stock,
      category: 'gadgets',
      tags: ['metrics-bust'],
    });
    const r3 = await api.adminGetSalesMetricsRaw(adminUser.token, { from, to });
    expect(r3.headers()['x-cache']).toBe('miss');

    await api.adminDeleteProduct(adminUser.token, id);
  });
});
