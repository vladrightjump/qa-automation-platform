// Thin, typed wrapper over Playwright's APIRequestContext. Every response is
// parsed through the shared Zod schema before it leaves the client — drift in
// the API surface fails here, with a clear contract-violation error, instead
// of leaking through specs as confusing `undefined` errors at the assertion
// site.
//
// Design note (Phase 13): this is deliberately kept as one cohesive,
// uniformly-shaped class rather than split into per-domain client modules. The
// methods share one tiny pattern (request → check → Zod-parse) with no
// cross-domain state, so a split would add import/composition indirection and
// churn every spec for little real gain. A per-domain split is recorded as a
// follow-up should the surface grow materially.
import type { APIRequestContext } from '@playwright/test';
import {
  AddressSchema,
  AuthResultSchema,
  CartSchema,
  GeoResolveSchema,
  LoyaltyBalanceSchema,
  MeSchema,
  OrderListSchema,
  OrderSchema,
  PagedOrdersSchema,
  PagedProductsSchema,
  PagedReviewsSchema,
  PagedSearchSchema,
  ProductSchema,
  PromoCodeListSchema,
  PromoPreviewSchema,
  RecommendationListSchema,
  RegionListSchema,
  ReturnSchema,
  ReviewSchema,
  ReviewSummarySchema,
  StockAlertListSchema,
  StockAlertSchema,
  SuggestionListSchema,
  WishlistSchema,
  z,
  type Address,
  type AuthResult,
  type Cart,
  type Locale,
  type Me,
  type Order,
  type PagedProducts,
  type PagedReviews,
  type PagedSearch,
  type PaymentMethod,
  type OrderStatus,
  type Product,
  type ProductCategory,
  type ProductSort,
  type PromoCode,
  type PromoPreview,
  type Recommendation,
  type Region,
  type Return,
  type Review,
  type ReviewSummary,
  type StockAlert,
  type Suggestion,
  type Wishlist,
} from '@qa/contracts';

const AddressListSchema = z.array(AddressSchema);

export type ReviewSort = 'newest' | 'highest' | 'lowest';

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

  // --- search + suggestions (phase 15a) ---

  // Raw variant kept so cache-spec tests can read response headers
  // (X-Cache: hit/miss/bypass) directly.
  listProductsRaw(query: ListProductsQuery = {}, headers: Record<string, string> = {}) {
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
    return this.request.get(url, { headers });
  }

  async searchProducts(
    q: string,
    page = 1,
    pageSize = 12,
  ): Promise<PagedSearch> {
    const params = new URLSearchParams({
      q,
      page: String(page),
      pageSize: String(pageSize),
    });
    const res = await this.request.get(
      `${API_BASE}/products/search?${params.toString()}`,
    );
    if (!res.ok()) {
      throw new Error(`searchProducts: ${res.status()} ${await res.text()}`);
    }
    return PagedSearchSchema.parse(await res.json());
  }

  searchProductsRaw(q: string | undefined, page = 1, pageSize = 12) {
    const params = new URLSearchParams();
    if (q !== undefined) params.set('q', q);
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    return this.request.get(`${API_BASE}/products/search?${params.toString()}`);
  }

  async suggestProducts(q: string, limit = 8): Promise<Suggestion[]> {
    const params = new URLSearchParams({ q, limit: String(limit) });
    const res = await this.request.get(
      `${API_BASE}/products/suggestions?${params.toString()}`,
    );
    if (!res.ok()) {
      throw new Error(`suggestProducts: ${res.status()} ${await res.text()}`);
    }
    return SuggestionListSchema.parse(await res.json());
  }

  suggestProductsRaw(q: string | undefined, limit?: number) {
    const params = new URLSearchParams();
    if (q !== undefined) params.set('q', q);
    if (limit !== undefined) params.set('limit', String(limit));
    return this.request.get(
      `${API_BASE}/products/suggestions?${params.toString()}`,
    );
  }

  // --- recommendations (phase 15b) ---

  async getRecommendations(
    token: string,
    recentlyViewed: string[] = [],
  ): Promise<Recommendation[]> {
    const headers: Record<string, string> = { ...authHeader(token) };
    if (recentlyViewed.length > 0) {
      headers['X-Recently-Viewed'] = recentlyViewed.join(',');
    }
    const res = await this.request.get(`${API_BASE}/recommendations`, { headers });
    if (!res.ok()) {
      throw new Error(`getRecommendations: ${res.status()} ${await res.text()}`);
    }
    return RecommendationListSchema.parse(await res.json());
  }

  getRecommendationsRaw(token: string | undefined, recentlyViewed: string[] = []) {
    const headers: Record<string, string> = { ...authHeader(token) };
    if (recentlyViewed.length > 0) {
      headers['X-Recently-Viewed'] = recentlyViewed.join(',');
    }
    return this.request.get(`${API_BASE}/recommendations`, { headers });
  }

  async refreshRecommendationView(): Promise<void> {
    const res = await this.request.post(
      `${API_BASE}/test/refresh-recommendation-view`,
    );
    if (!res.ok()) {
      throw new Error(`refreshRecommendationView: ${res.status()} ${await res.text()}`);
    }
  }

  async bulkSeedProducts(count: number, rngSeed = 42): Promise<{
    inserted: number;
    total: number;
  }> {
    const res = await this.request.post(`${API_BASE}/test/bulk-seed-products`, {
      data: { count, rngSeed },
    });
    if (!res.ok()) {
      throw new Error(`bulkSeedProducts: ${res.status()} ${await res.text()}`);
    }
    return (await res.json()) as { inserted: number; total: number };
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

  async updateCartItem(
    token: string,
    productId: string,
    quantity: number,
  ): Promise<Cart> {
    const res = await this.request.patch(
      `${API_BASE}/cart/items/${productId}`,
      { headers: authHeader(token), data: { quantity } },
    );
    if (!res.ok()) {
      throw new Error(`updateCartItem: ${res.status()} ${await res.text()}`);
    }
    return CartSchema.parse(await res.json());
  }

  async reorderCart(token: string, order: string[]): Promise<Cart> {
    const res = await this.request.patch(`${API_BASE}/cart/reorder`, {
      headers: authHeader(token),
      data: { order },
    });
    if (!res.ok()) {
      throw new Error(`reorderCart: ${res.status()} ${await res.text()}`);
    }
    return CartSchema.parse(await res.json());
  }

  async cancelOrder(token: string, id: string): Promise<Order> {
    const res = await this.request.post(
      `${API_BASE}/orders/${id}/cancel`,
      { headers: authHeader(token) },
    );
    if (!res.ok()) {
      throw new Error(`cancelOrder: ${res.status()} ${await res.text()}`);
    }
    return OrderSchema.parse(await res.json());
  }

  async requestReturn(
    token: string,
    id: string,
    reason: string,
  ): Promise<Return> {
    const res = await this.request.post(`${API_BASE}/orders/${id}/return`, {
      headers: authHeader(token),
      data: { reason },
    });
    if (!res.ok()) {
      throw new Error(`requestReturn: ${res.status()} ${await res.text()}`);
    }
    return ReturnSchema.parse(await res.json());
  }

  // --- orders / checkout ---
  async checkout(
    token: string,
    input: {
      addressId?: string;
      paymentMethod?: PaymentMethod;
      promoCode?: string;
      redeemPoints?: number;
    } = {},
  ): Promise<Order> {
    const res = await this.request.post(`${API_BASE}/orders`, {
      headers: authHeader(token),
      data: input,
    });
    if (!res.ok()) {
      throw new Error(`checkout: ${res.status()} ${await res.text()}`);
    }
    return OrderSchema.parse(await res.json());
  }

  async applyPromo(token: string, code: string): Promise<PromoPreview> {
    const res = await this.request.post(`${API_BASE}/promo-codes/apply`, {
      headers: authHeader(token),
      data: { code },
    });
    if (!res.ok()) {
      throw new Error(`applyPromo: ${res.status()} ${await res.text()}`);
    }
    return PromoPreviewSchema.parse(await res.json());
  }

  // Public promo discovery — no auth required.
  async listPromoCodes(): Promise<PromoCode[]> {
    const res = await this.request.get(`${API_BASE}/promo-codes`);
    if (!res.ok()) {
      throw new Error(`listPromoCodes: ${res.status()} ${await res.text()}`);
    }
    return PromoCodeListSchema.parse(await res.json());
  }

  // --- addresses ---
  async listAddresses(token: string): Promise<Address[]> {
    const res = await this.request.get(`${API_BASE}/addresses`, {
      headers: authHeader(token),
    });
    if (!res.ok()) throw new Error(`listAddresses: ${res.status()}`);
    return AddressListSchema.parse(await res.json());
  }

  async createAddress(
    token: string,
    input: {
      label: string;
      name: string;
      line1: string;
      line2?: string;
      city: string;
      postalCode: string;
      country?: string;
      isDefault?: boolean;
    },
  ): Promise<Address> {
    const res = await this.request.post(`${API_BASE}/addresses`, {
      headers: authHeader(token),
      data: input,
    });
    if (!res.ok()) {
      throw new Error(`createAddress: ${res.status()} ${await res.text()}`);
    }
    return AddressSchema.parse(await res.json());
  }

  async updateAddress(
    token: string,
    id: string,
    patch: Record<string, unknown>,
  ): Promise<Address> {
    const res = await this.request.patch(`${API_BASE}/addresses/${id}`, {
      headers: authHeader(token),
      data: patch,
    });
    if (!res.ok()) {
      throw new Error(`updateAddress: ${res.status()} ${await res.text()}`);
    }
    return AddressSchema.parse(await res.json());
  }

  async deleteAddress(token: string, id: string): Promise<void> {
    const res = await this.request.delete(`${API_BASE}/addresses/${id}`, {
      headers: authHeader(token),
    });
    if (!res.ok()) throw new Error(`deleteAddress: ${res.status()}`);
  }

  // --- wishlist ---
  async getWishlist(token: string): Promise<Wishlist> {
    const res = await this.request.get(`${API_BASE}/wishlist`, {
      headers: authHeader(token),
    });
    if (!res.ok()) throw new Error(`getWishlist: ${res.status()}`);
    return WishlistSchema.parse(await res.json());
  }

  async addToWishlist(token: string, productId: string): Promise<Wishlist> {
    const res = await this.request.post(`${API_BASE}/wishlist/items`, {
      headers: authHeader(token),
      data: { productId },
    });
    if (!res.ok()) {
      throw new Error(`addToWishlist: ${res.status()} ${await res.text()}`);
    }
    return WishlistSchema.parse(await res.json());
  }

  async removeFromWishlist(token: string, productId: string): Promise<Wishlist> {
    const res = await this.request.delete(
      `${API_BASE}/wishlist/items/${productId}`,
      { headers: authHeader(token) },
    );
    if (!res.ok()) throw new Error(`removeFromWishlist: ${res.status()}`);
    return WishlistSchema.parse(await res.json());
  }

  // --- reviews ---
  async listReviews(
    productId: string,
    query: { sort?: ReviewSort; page?: number; pageSize?: number } = {},
  ): Promise<PagedReviews> {
    const params = new URLSearchParams();
    if (query.sort) params.set('sort', query.sort);
    if (query.page) params.set('page', String(query.page));
    if (query.pageSize) params.set('pageSize', String(query.pageSize));
    const qs = params.toString();
    const url = `${API_BASE}/products/${productId}/reviews${qs ? `?${qs}` : ''}`;
    const res = await this.request.get(url);
    if (!res.ok()) throw new Error(`listReviews: ${res.status()}`);
    return PagedReviewsSchema.parse(await res.json());
  }

  async reviewSummary(productId: string): Promise<ReviewSummary> {
    const res = await this.request.get(
      `${API_BASE}/products/${productId}/reviews/summary`,
    );
    if (!res.ok()) throw new Error(`reviewSummary: ${res.status()}`);
    return ReviewSummarySchema.parse(await res.json());
  }

  async createReview(
    token: string,
    productId: string,
    input: { rating: number; title: string; body: string },
  ): Promise<Review> {
    const res = await this.request.post(
      `${API_BASE}/products/${productId}/reviews`,
      { headers: authHeader(token), data: input },
    );
    if (!res.ok()) {
      throw new Error(`createReview: ${res.status()} ${await res.text()}`);
    }
    return ReviewSchema.parse(await res.json());
  }

  async deleteReview(token: string, id: string): Promise<void> {
    const res = await this.request.delete(`${API_BASE}/reviews/${id}`, {
      headers: authHeader(token),
    });
    if (!res.ok()) throw new Error(`deleteReview: ${res.status()}`);
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

  // --- admin/orders ---
  async adminListOrders(
    token: string,
    status?: OrderStatus,
    page = 1,
    pageSize = 20,
  ) {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (status) params.set('status', status);
    const res = await this.request.get(
      `${API_BASE}/admin/orders?${params.toString()}`,
      { headers: authHeader(token) },
    );
    if (!res.ok()) {
      throw new Error(`adminListOrders: ${res.status()} ${await res.text()}`);
    }
    return PagedOrdersSchema.parse(await res.json());
  }

  async adminFulfillOrder(token: string, id: string): Promise<Order> {
    const res = await this.request.post(
      `${API_BASE}/admin/orders/${id}/fulfill`,
      { headers: authHeader(token) },
    );
    if (!res.ok()) {
      throw new Error(`adminFulfillOrder: ${res.status()} ${await res.text()}`);
    }
    return OrderSchema.parse(await res.json());
  }

  async adminDecideReturn(
    token: string,
    id: string,
    decision: 'approve' | 'reject' | 'refund',
  ): Promise<Return> {
    const res = await this.request.post(
      `${API_BASE}/admin/returns/${id}/${decision}`,
      { headers: authHeader(token) },
    );
    if (!res.ok()) {
      throw new Error(
        `adminDecideReturn(${decision}): ${res.status()} ${await res.text()}`,
      );
    }
    return ReturnSchema.parse(await res.json());
  }

  // --- back-in-stock alerts ---
  async subscribeStockAlert(
    token: string,
    productId: string,
  ): Promise<StockAlert> {
    const res = await this.request.post(
      `${API_BASE}/products/${productId}/stock-alert`,
      { headers: authHeader(token) },
    );
    if (!res.ok()) {
      throw new Error(
        `subscribeStockAlert: ${res.status()} ${await res.text()}`,
      );
    }
    return StockAlertSchema.parse(await res.json());
  }

  async unsubscribeStockAlert(token: string, productId: string): Promise<void> {
    const res = await this.request.delete(
      `${API_BASE}/products/${productId}/stock-alert`,
      { headers: authHeader(token) },
    );
    if (!res.ok()) {
      throw new Error(
        `unsubscribeStockAlert: ${res.status()} ${await res.text()}`,
      );
    }
  }

  async listStockAlerts(token: string): Promise<StockAlert[]> {
    const res = await this.request.get(`${API_BASE}/stock-alerts`, {
      headers: authHeader(token),
    });
    if (!res.ok()) {
      throw new Error(`listStockAlerts: ${res.status()} ${await res.text()}`);
    }
    return StockAlertListSchema.parse(await res.json());
  }

  // --- loyalty ---
  async getLoyalty(token: string) {
    const res = await this.request.get(`${API_BASE}/loyalty`, {
      headers: authHeader(token),
    });
    if (!res.ok()) {
      throw new Error(`getLoyalty: ${res.status()} ${await res.text()}`);
    }
    return LoyaltyBalanceSchema.parse(await res.json());
  }

  // --- geo / locale ---
  async resolveGeo(lat: number, lng: number): Promise<Region> {
    const res = await this.request.get(
      `${API_BASE}/geo/resolve?lat=${lat}&lng=${lng}`,
    );
    if (!res.ok()) {
      throw new Error(`resolveGeo(${lat},${lng}): ${res.status()} ${await res.text()}`);
    }
    return GeoResolveSchema.parse(await res.json());
  }

  // Like resolveGeo but returns the raw response so negative-path specs can
  // assert on status codes / error bodies without throwing.
  resolveGeoRaw(lat: unknown, lng: unknown) {
    return this.request.get(
      `${API_BASE}/geo/resolve?lat=${String(lat)}&lng=${String(lng)}`,
    );
  }

  async listRegions(): Promise<Region[]> {
    const res = await this.request.get(`${API_BASE}/geo/regions`);
    if (!res.ok()) {
      throw new Error(`listRegions: ${res.status()} ${await res.text()}`);
    }
    return RegionListSchema.parse(await res.json());
  }

  async setLocale(token: string, locale: Locale): Promise<Me> {
    const res = await this.request.patch(`${API_BASE}/me/locale`, {
      headers: authHeader(token),
      data: { locale },
    });
    if (!res.ok()) {
      throw new Error(`setLocale: ${res.status()} ${await res.text()}`);
    }
    return MeSchema.parse(await res.json());
  }

  setLocaleRaw(token: string, locale: unknown) {
    return this.request.patch(`${API_BASE}/me/locale`, {
      headers: authHeader(token),
      data: { locale },
    });
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
