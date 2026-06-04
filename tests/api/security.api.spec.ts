// RBAC denial matrix. Five representative admin endpoints (one of each
// shape — GET list, POST create, PATCH, DELETE, POST action on an order)
// times three roles (unauthenticated, USER, ADMIN). The guard short-
// circuits before the service for 401/403 rows, so those rows can use a
// synthetic UUID; the ADMIN row seeds a real entity inline.
import { test, expect } from '../fixtures';
import { API_BASE } from '../support/api-client';
import { seedPaidOrder } from '../support/seed';
import { AdminProductFactory } from '../factories/admin-product.factory';
import type { APIRequestContext, APIResponse } from '@playwright/test';

const FAKE_ID = '00000000-0000-0000-0000-000000000000';

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface Endpoint {
  name: string;
  method: Method;
  // Returns url + optional body. ADMIN-row tests prepare a real entity
  // and supply its id; 401/403 rows pass FAKE_ID and never reach the
  // service.
  build: (entityId: string) => { url: string; data?: unknown };
  adminStatus: number;
  prepareEntity?: 'product' | 'order';
}

const ENDPOINTS: Endpoint[] = [
  {
    name: 'GET /admin/products',
    method: 'GET',
    build: () => ({ url: `${API_BASE}/admin/products` }),
    adminStatus: 200,
  },
  {
    name: 'POST /admin/products',
    method: 'POST',
    build: () => ({
      url: `${API_BASE}/admin/products`,
      data: AdminProductFactory.build(),
    }),
    adminStatus: 201,
  },
  {
    name: 'PATCH /admin/products/:id',
    method: 'PATCH',
    build: (id) => ({
      url: `${API_BASE}/admin/products/${id}`,
      data: { stock: 99 },
    }),
    adminStatus: 200,
    prepareEntity: 'product',
  },
  {
    name: 'DELETE /admin/products/:id',
    method: 'DELETE',
    build: (id) => ({ url: `${API_BASE}/admin/products/${id}` }),
    adminStatus: 204,
    prepareEntity: 'product',
  },
  {
    name: 'POST /admin/orders/:id/fulfill',
    method: 'POST',
    build: (id) => ({ url: `${API_BASE}/admin/orders/${id}/fulfill` }),
    adminStatus: 200,
    prepareEntity: 'order',
  },
];

function dispatch(
  raw: APIRequestContext,
  method: Method,
  url: string,
  headers: Record<string, string>,
  data?: unknown,
): Promise<APIResponse> {
  const opts = { headers, ...(data !== undefined ? { data } : {}) };
  if (method === 'GET') return raw.get(url, opts);
  if (method === 'POST') return raw.post(url, opts);
  if (method === 'PATCH') return raw.patch(url, opts);
  return raw.delete(url, opts);
}

test.describe('RBAC denial matrix', () => {
  for (const ep of ENDPOINTS) {
    test.describe(ep.name, () => {
      test(
        'unauthenticated → 401',
        { tag: ['@security', '@regression'] },
        async ({ api }) => {
          const { url, data } = ep.build(FAKE_ID);
          const res = await dispatch(api.raw(), ep.method, url, {}, data);
          expect(res.status()).toBe(401);
        },
      );

      test(
        'USER role → 403',
        { tag: ['@security', '@sanity', '@regression'] },
        async ({ api, testUser }) => {
          const { url, data } = ep.build(FAKE_ID);
          const res = await dispatch(
            api.raw(),
            ep.method,
            url,
            { Authorization: `Bearer ${testUser.token}` },
            data,
          );
          expect(res.status()).toBe(403);
        },
      );

      test(
        `ADMIN role → ${ep.adminStatus}`,
        { tag: ['@security', '@regression'] },
        async ({ api, db, adminUser, testUser }) => {
          let entityId = FAKE_ID;
          if (ep.prepareEntity === 'product') {
            const created = await api.adminCreateProduct(
              adminUser.token,
              AdminProductFactory.build(),
            );
            entityId = created.id;
          } else if (ep.prepareEntity === 'order') {
            const order = await seedPaidOrder(api, db, {
              token: testUser.token,
            });
            entityId = order.id;
          }
          const { url, data } = ep.build(entityId);
          const res = await dispatch(
            api.raw(),
            ep.method,
            url,
            { Authorization: `Bearer ${adminUser.token}` },
            data,
          );
          expect(res.status()).toBe(ep.adminStatus);
        },
      );
    });
  }
});
