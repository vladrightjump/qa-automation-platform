// Typed fetch wrapper for the SUT API. Entity types are imported from
// @qa/contracts — the single Zod-defined source of truth that the test client
// also consumes — so the web app and the API contract can never silently drift.
import type {
  Address,
  AuthResult,
  Cart,
  CartItem,
  Order,
  OrderItem,
  OrderStatus,
  PagedOrders,
  PagedProducts,
  PaymentMethod,
  Product,
  ProductCategory,
  ProductSort,
  User,
  UserRole,
} from '@qa/contracts';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export type {
  Address,
  AuthResult,
  Cart,
  CartItem,
  Order,
  OrderItem,
  OrderStatus,
  PagedOrders,
  PagedProducts,
  PaymentMethod,
  Product,
  ProductCategory,
  ProductSort,
  User,
  UserRole,
};

export interface ListProductsQuery {
  q?: string;
  category?: ProductCategory[];
  minPriceCents?: number;
  maxPriceCents?: number;
  sort?: ProductSort;
  page?: number;
  pageSize?: number;
}

export interface AddressInput {
  label: string;
  name: string;
  line1: string;
  line2?: string;
  city: string;
  postalCode: string;
  country?: string;
  isDefault?: boolean;
}

export interface CheckoutInput {
  addressId?: string;
  paymentMethod?: PaymentMethod;
}

export interface AdminProductInput {
  id?: string;
  name: string;
  description?: string | null;
  priceCents: number;
  stock: number;
  category: ProductCategory;
  tags?: string[];
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });
  const text = await res.text();
  const data: unknown = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg =
      (data as { message?: string | string[] } | null)?.message ??
      `${res.status} ${res.statusText}`;
    throw new ApiError(Array.isArray(msg) ? msg.join(', ') : String(msg), res.status);
  }
  return data as T;
}

function buildProductsQuery(query: ListProductsQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.category) for (const c of query.category) params.append('category', c);
  if (query.minPriceCents != null) params.set('minPriceCents', String(query.minPriceCents));
  if (query.maxPriceCents != null) params.set('maxPriceCents', String(query.maxPriceCents));
  if (query.sort) params.set('sort', query.sort);
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const api = {
  listProducts: (query: ListProductsQuery = {}) =>
    request<PagedProducts>(`/products${buildProductsQuery(query)}`),
  getProduct: (id: string) => request<Product>(`/products/${id}`),

  register: (email: string, password: string) =>
    request<AuthResult>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    request<AuthResult>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getCart: (token: string) => request<Cart>('/cart', {}, token),
  addToCart: (token: string, productId: string, quantity: number) =>
    request<Cart>(
      '/cart/items',
      { method: 'POST', body: JSON.stringify({ productId, quantity }) },
      token,
    ),
  removeFromCart: (token: string, productId: string) =>
    request<Cart>(`/cart/items/${productId}`, { method: 'DELETE' }, token),
  updateCartItem: (token: string, productId: string, quantity: number) =>
    request<Cart>(
      `/cart/items/${productId}`,
      { method: 'PATCH', body: JSON.stringify({ quantity }) },
      token,
    ),
  reorderCart: (token: string, order: string[]) =>
    request<Cart>(
      '/cart/reorder',
      { method: 'PATCH', body: JSON.stringify({ order }) },
      token,
    ),

  checkout: (token: string, input: CheckoutInput = {}) =>
    request<Order>(
      '/orders',
      { method: 'POST', body: JSON.stringify(input) },
      token,
    ),
  listOrders: (token: string) => request<Order[]>('/orders', {}, token),
  getOrder: (token: string, id: string) =>
    request<Order>(`/orders/${id}`, {}, token),
  cancelOrder: (token: string, id: string) =>
    request<Order>(`/orders/${id}/cancel`, { method: 'POST' }, token),

  listAddresses: (token: string) => request<Address[]>('/addresses', {}, token),
  createAddress: (token: string, input: AddressInput) =>
    request<Address>(
      '/addresses',
      { method: 'POST', body: JSON.stringify(input) },
      token,
    ),
  updateAddress: (token: string, id: string, patch: Partial<AddressInput>) =>
    request<Address>(
      `/addresses/${id}`,
      { method: 'PATCH', body: JSON.stringify(patch) },
      token,
    ),
  deleteAddress: (token: string, id: string) =>
    request<{ ok: true }>(`/addresses/${id}`, { method: 'DELETE' }, token),

  adminListProducts: (token: string, page = 1, pageSize = 20) =>
    request<PagedProducts>(
      `/admin/products?page=${page}&pageSize=${pageSize}`,
      {},
      token,
    ),
  adminCreateProduct: (token: string, input: AdminProductInput) =>
    request<Product>(
      '/admin/products',
      { method: 'POST', body: JSON.stringify(input) },
      token,
    ),
  adminUpdateProduct: (
    token: string,
    id: string,
    patch: Partial<AdminProductInput>,
  ) =>
    request<Product>(
      `/admin/products/${id}`,
      { method: 'PATCH', body: JSON.stringify(patch) },
      token,
    ),
  adminDeleteProduct: (token: string, id: string) =>
    request<{ ok: true }>(`/admin/products/${id}`, { method: 'DELETE' }, token),
};
