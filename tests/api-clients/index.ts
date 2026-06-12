// Composition root for the subject-domain API clients. The constructor
// signature `new ApiClient(request)` is unchanged from the previous flat
// implementation, so fixtures don't need to know about the split.
import type { APIRequestContext } from '@playwright/test';
import { API_BASE, type RequestContext } from './base';
import { AuthClient } from './auth.client';
import { ProductsClient } from './products.client';
import { CartClient } from './cart.client';
import { CheckoutClient } from './checkout.client';
import { OrdersClient } from './orders.client';
import { AdminClient } from './admin.client';

export class ApiClient {
  readonly auth: AuthClient;
  readonly products: ProductsClient;
  readonly cart: CartClient;
  readonly checkout: CheckoutClient;
  readonly orders: OrdersClient;
  readonly admin: AdminClient;

  private readonly ctx: RequestContext;

  constructor(request: APIRequestContext, baseUrl: string = API_BASE) {
    this.ctx = { request, baseUrl };
    this.auth = new AuthClient(this.ctx);
    this.products = new ProductsClient(this.ctx);
    this.cart = new CartClient(this.ctx);
    this.checkout = new CheckoutClient(this.ctx);
    this.orders = new OrdersClient(this.ctx);
    this.admin = new AdminClient(this.ctx);
  }

  // Escape hatch for negative-path tests that need to inspect raw status
  // codes / error bodies without going through a Zod schema.
  raw(): APIRequestContext {
    return this.ctx.request;
  }
}

export { API_BASE } from './base';
export type { RequestContext } from './base';
export type { AddressInput, CheckoutInput } from './checkout.client';
export type { AdminProductInput } from './admin.client';
export type { ListProductsQuery } from './products.client';
