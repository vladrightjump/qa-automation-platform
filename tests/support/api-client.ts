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
  ProductListSchema,
  ProductSchema,
  type AuthResult,
  type Cart,
  type Order,
  type Product,
} from '@qa/contracts';

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:3001';

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
  async listProducts(): Promise<Product[]> {
    const res = await this.request.get(`${API_BASE}/products`);
    if (!res.ok()) throw new Error(`listProducts: ${res.status()}`);
    return ProductListSchema.parse(await res.json());
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
