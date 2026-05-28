// Thin, typed wrapper over Playwright's APIRequestContext. Every response is
// parsed through the shared Zod schema before it leaves the client — drift in
// the API surface fails here, with a clear contract-violation error, instead
// of leaking through specs as confusing `undefined` errors at the assertion
// site.
import type { APIRequestContext } from '@playwright/test';
import {
  AuthResultSchema,
  CartSchema,
  OrderListSchema,
  OrderSchema,
  PagedProductsSchema,
  ProductSchema,
  type AuthResult,
  type Cart,
  type Order,
  type PagedProducts,
  type Product,
  type ProductCategory,
  type ProductSort,
} from '@qa/contracts';

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:3001';

export interface ListProductsQuery {
  q?: string;
  category?: ProductCategory[];
  minPriceCents?: number;
  maxPriceCents?: number;
  sort?: ProductSort;
  page?: number;
  pageSize?: number;
}

function authHeader(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export class ApiClient {
  constructor(private readonly request: APIRequestContext) {}

  // --- auth ---
  async register(email: string, password: string): Promise<AuthResult> {
    const res = await this.request.post(`${API_BASE}/auth/register`, {
      data: { email, password },
    });
    if (!res.ok()) {
      throw new Error(`register failed: ${res.status()} ${await res.text()}`);
    }
    return AuthResultSchema.parse(await res.json());
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const res = await this.request.post(`${API_BASE}/auth/login`, {
      data: { email, password },
    });
    if (!res.ok()) {
      throw new Error(`login failed: ${res.status()} ${await res.text()}`);
    }
    return AuthResultSchema.parse(await res.json());
  }

  // --- products ---
  async listProducts(query: ListProductsQuery = {}): Promise<PagedProducts> {
    const params = new URLSearchParams();
    if (query.q) params.set('q', query.q);
    if (query.category)
      for (const c of query.category) params.append('category', c);
    if (query.minPriceCents != null)
      params.set('minPriceCents', String(query.minPriceCents));
    if (query.maxPriceCents != null)
      params.set('maxPriceCents', String(query.maxPriceCents));
    if (query.sort) params.set('sort', query.sort);
    if (query.page) params.set('page', String(query.page));
    if (query.pageSize) params.set('pageSize', String(query.pageSize));
    const qs = params.toString();
    const url = qs ? `${API_BASE}/products?${qs}` : `${API_BASE}/products`;
    const res = await this.request.get(url);
    if (!res.ok()) throw new Error(`listProducts: ${res.status()}`);
    return PagedProductsSchema.parse(await res.json());
  }

  async getProduct(id: string): Promise<Product> {
    const res = await this.request.get(`${API_BASE}/products/${id}`);
    if (!res.ok()) throw new Error(`getProduct(${id}): ${res.status()}`);
    return ProductSchema.parse(await res.json());
  }

  // --- cart ---
  async getCart(token: string): Promise<Cart> {
    const res = await this.request.get(`${API_BASE}/cart`, {
      headers: authHeader(token),
    });
    if (!res.ok()) throw new Error(`getCart: ${res.status()}`);
    return CartSchema.parse(await res.json());
  }

  async addToCart(
    token: string,
    productId: string,
    quantity = 1,
  ): Promise<Cart> {
    const res = await this.request.post(`${API_BASE}/cart/items`, {
      headers: authHeader(token),
      data: { productId, quantity },
    });
    if (!res.ok()) {
      throw new Error(`addToCart: ${res.status()} ${await res.text()}`);
    }
    return CartSchema.parse(await res.json());
  }

  async removeFromCart(token: string, productId: string): Promise<Cart> {
    const res = await this.request.delete(
      `${API_BASE}/cart/items/${productId}`,
      { headers: authHeader(token) },
    );
    if (!res.ok()) throw new Error(`removeFromCart: ${res.status()}`);
    return CartSchema.parse(await res.json());
  }

  // --- orders / checkout ---
  async checkout(token: string): Promise<Order> {
    const res = await this.request.post(`${API_BASE}/orders`, {
      headers: authHeader(token),
    });
    if (!res.ok()) {
      throw new Error(`checkout: ${res.status()} ${await res.text()}`);
    }
    return OrderSchema.parse(await res.json());
  }

  async listOrders(token: string): Promise<Order[]> {
    const res = await this.request.get(`${API_BASE}/orders`, {
      headers: authHeader(token),
    });
    if (!res.ok()) throw new Error(`listOrders: ${res.status()}`);
    return OrderListSchema.parse(await res.json());
  }

  async getOrder(token: string, id: string): Promise<Order> {
    const res = await this.request.get(`${API_BASE}/orders/${id}`, {
      headers: authHeader(token),
    });
    if (!res.ok()) throw new Error(`getOrder(${id}): ${res.status()}`);
    return OrderSchema.parse(await res.json());
  }

  // --- admin/products ---
  async adminListProducts(token: string, page = 1, pageSize = 20) {
    const res = await this.request.get(
      `${API_BASE}/admin/products?page=${page}&pageSize=${pageSize}`,
      { headers: authHeader(token) },
    );
    if (!res.ok()) {
      throw new Error(`adminListProducts: ${res.status()} ${await res.text()}`);
    }
    return PagedProductsSchema.parse(await res.json());
  }

  async adminCreateProduct(
    token: string,
    input: {
      id: string;
      name: string;
      description?: string | null;
      priceCents: number;
      stock: number;
      category: ProductCategory;
      tags?: string[];
    },
  ): Promise<Product> {
    const res = await this.request.post(`${API_BASE}/admin/products`, {
      headers: authHeader(token),
      data: input,
    });
    if (!res.ok()) {
      throw new Error(`adminCreateProduct: ${res.status()} ${await res.text()}`);
    }
    return ProductSchema.parse(await res.json());
  }

  async adminUpdateProduct(
    token: string,
    id: string,
    patch: Record<string, unknown>,
  ): Promise<Product> {
    const res = await this.request.patch(`${API_BASE}/admin/products/${id}`, {
      headers: authHeader(token),
      data: patch,
    });
    if (!res.ok()) {
      throw new Error(`adminUpdateProduct: ${res.status()} ${await res.text()}`);
    }
    return ProductSchema.parse(await res.json());
  }

  async adminDeleteProduct(token: string, id: string): Promise<void> {
    const res = await this.request.delete(`${API_BASE}/admin/products/${id}`, {
      headers: authHeader(token),
    });
    if (!res.ok()) {
      throw new Error(`adminDeleteProduct: ${res.status()} ${await res.text()}`);
    }
  }

  // --- test seam (env-guarded on the API side) ---
  async resetTestData(): Promise<void> {
    const res = await this.request.post(`${API_BASE}/test/reset`);
    if (!res.ok()) throw new Error(`resetTestData: ${res.status()}`);
  }

  // --- raw escape hatch for negative-path tests ---
  raw(): APIRequestContext {
    return this.request;
  }
}

export { API_BASE };
