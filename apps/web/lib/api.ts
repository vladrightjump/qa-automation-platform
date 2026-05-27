// Typed fetch wrapper for the SUT API. Types are kept inline for now —
// Phase 4 will replace them with the shared Zod schemas in @qa/contracts.

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface Product {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  stock: number;
}

export interface User {
  id: string;
  email: string;
}

export interface AuthResult {
  token: string;
  user: User;
}

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  product: Product;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
}

export type OrderStatus = 'PENDING' | 'PAID' | 'FULFILLED' | 'CANCELLED';

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPriceCents: number;
}

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  totalCents: number;
  createdAt: string;
  items: OrderItem[];
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

export const api = {
  listProducts: () => request<Product[]>('/products'),
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

  checkout: (token: string) =>
    request<Order>('/orders', { method: 'POST' }, token),
  listOrders: (token: string) => request<Order[]>('/orders', {}, token),
  getOrder: (token: string, id: string) =>
    request<Order>(`/orders/${id}`, {}, token),
};
