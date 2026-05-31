// Typed fetch wrapper for the SUT API. Entity types are imported from
// @qa/contracts — the single Zod-defined source of truth that the test client
// also consumes — so the web app and the API contract can never silently drift.
// Only genuinely web-local request shapes are declared in this file.
import type {
  Address,
  AuthResult,
  Cart,
  CartItem,
  LoyaltyBalance,
  LoyaltyTransaction,
  LoyaltyType,
  Order,
  OrderItem,
  OrderStatus,
  PagedOrders,
  PagedProducts,
  PagedReviews,
  PaymentMethod,
  Product,
  ProductCategory,
  ProductSort,
  PromoCode,
  PromoPreview,
  Return as OrderReturn,
  ReturnStatus,
  Review,
  ReviewSummary,
  StockAlert,
  User,
  UserRole,
  Wishlist,
  WishlistItem,
} from '@qa/contracts';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// Re-export the contract types so existing `@/lib/api` imports across web
// modules keep resolving from here — no call-site churn.
export type {
  Address,
  AuthResult,
  Cart,
  CartItem,
  LoyaltyBalance,
  LoyaltyTransaction,
  LoyaltyType,
  Order,
  OrderItem,
  OrderStatus,
  OrderReturn,
  PagedOrders,
  PagedProducts,
  PagedReviews,
  PaymentMethod,
  Product,
  ProductCategory,
  ProductSort,
  PromoCode,
  PromoPreview,
  ReturnStatus,
  Review,
  ReviewSummary,
  StockAlert,
  User,
  UserRole,
  Wishlist,
  WishlistItem,
};

// ---- web-local request shapes (not part of the response contract) ----

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
  promoCode?: string;
  redeemPoints?: number;
}

export type ReviewSort = 'newest' | 'highest' | 'lowest';

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

  // ---- back-in-stock alerts ----
  subscribeStockAlert: (token: string, productId: string) =>
    request<StockAlert>(
      `/products/${productId}/stock-alert`,
      { method: 'POST' },
      token,
    ),
  unsubscribeStockAlert: (token: string, productId: string) =>
    request<{ ok: true }>(
      `/products/${productId}/stock-alert`,
      { method: 'DELETE' },
      token,
    ),
  listStockAlerts: (token: string) =>
    request<StockAlert[]>('/stock-alerts', {}, token),

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
  cancelOrder: (token: string, id: string) =>
    request<Order>(`/orders/${id}/cancel`, { method: 'POST' }, token),
  requestReturn: (token: string, id: string, reason: string) =>
    request<OrderReturn>(
      `/orders/${id}/return`,
      { method: 'POST', body: JSON.stringify({ reason }) },
      token,
    ),

  checkout: (token: string, input: CheckoutInput = {}) =>
    request<Order>(
      '/orders',
      { method: 'POST', body: JSON.stringify(input) },
      token,
    ),

  getLoyalty: (token: string) =>
    request<LoyaltyBalance>('/loyalty', {}, token),

  applyPromo: (token: string, code: string) =>
    request<PromoPreview>(
      '/promo-codes/apply',
      { method: 'POST', body: JSON.stringify({ code }) },
      token,
    ),

  // Public discovery — featured/active deals shown in the checkout panel.
  listPromoCodes: () => request<PromoCode[]>('/promo-codes', {}),

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

  // --- wishlist ---
  getWishlist: (token: string) => request<Wishlist>('/wishlist', {}, token),
  addToWishlist: (token: string, productId: string) =>
    request<Wishlist>(
      '/wishlist/items',
      { method: 'POST', body: JSON.stringify({ productId }) },
      token,
    ),
  removeFromWishlist: (token: string, productId: string) =>
    request<Wishlist>(
      `/wishlist/items/${productId}`,
      { method: 'DELETE' },
      token,
    ),

  // --- reviews ---
  listReviews: (
    productId: string,
    query: { sort?: ReviewSort; page?: number; pageSize?: number } = {},
  ) => {
    const params = new URLSearchParams();
    if (query.sort) params.set('sort', query.sort);
    if (query.page) params.set('page', String(query.page));
    if (query.pageSize) params.set('pageSize', String(query.pageSize));
    const qs = params.toString();
    return request<PagedReviews>(
      `/products/${productId}/reviews${qs ? `?${qs}` : ''}`,
    );
  },
  reviewSummary: (productId: string) =>
    request<ReviewSummary>(`/products/${productId}/reviews/summary`),
  createReview: (
    token: string,
    productId: string,
    input: { rating: number; title: string; body: string },
  ) =>
    request<Review>(
      `/products/${productId}/reviews`,
      { method: 'POST', body: JSON.stringify(input) },
      token,
    ),
  deleteReview: (token: string, id: string) =>
    request<{ ok: true }>(`/reviews/${id}`, { method: 'DELETE' }, token),
  listOrders: (token: string) => request<Order[]>('/orders', {}, token),
  getOrder: (token: string, id: string) =>
    request<Order>(`/orders/${id}`, {}, token),

  // ---- admin ----
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

  // ---- admin / orders ----
  adminListOrders: (token: string, status?: OrderStatus, page = 1, pageSize = 20) => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (status) params.set('status', status);
    return request<PagedOrders>(`/admin/orders?${params.toString()}`, {}, token);
  },
  adminFulfillOrder: (token: string, id: string) =>
    request<Order>(`/admin/orders/${id}/fulfill`, { method: 'POST' }, token),
  adminApproveReturn: (token: string, id: string) =>
    request<OrderReturn>(`/admin/returns/${id}/approve`, { method: 'POST' }, token),
  adminRejectReturn: (token: string, id: string) =>
    request<OrderReturn>(`/admin/returns/${id}/reject`, { method: 'POST' }, token),
  adminRefundReturn: (token: string, id: string) =>
    request<OrderReturn>(`/admin/returns/${id}/refund`, { method: 'POST' }, token),
};
