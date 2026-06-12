import { CartSchema, type Cart } from '@qa/contracts';
import { authHeader, parseJson, type RequestContext } from './base';

export class CartClient {
  constructor(private readonly ctx: RequestContext) {}

  async get(token: string): Promise<Cart> {
    const res = await this.ctx.request.get(`${this.ctx.baseUrl}/cart`, {
      headers: authHeader(token),
    });
    return parseJson(res, CartSchema, 'cart.get');
  }

  async addItem(token: string, productId: string, quantity = 1): Promise<Cart> {
    const res = await this.ctx.request.post(`${this.ctx.baseUrl}/cart/items`, {
      headers: authHeader(token),
      data: { productId, quantity },
    });
    return parseJson(res, CartSchema, 'cart.addItem');
  }

  async updateItem(token: string, productId: string, quantity: number): Promise<Cart> {
    const res = await this.ctx.request.patch(
      `${this.ctx.baseUrl}/cart/items/${productId}`,
      { headers: authHeader(token), data: { quantity } },
    );
    return parseJson(res, CartSchema, 'cart.updateItem');
  }

  async removeItem(token: string, productId: string): Promise<Cart> {
    const res = await this.ctx.request.delete(
      `${this.ctx.baseUrl}/cart/items/${productId}`,
      { headers: authHeader(token) },
    );
    return parseJson(res, CartSchema, 'cart.removeItem');
  }

  async reorder(token: string, order: string[]): Promise<Cart> {
    const res = await this.ctx.request.patch(`${this.ctx.baseUrl}/cart/reorder`, {
      headers: authHeader(token),
      data: { order },
    });
    return parseJson(res, CartSchema, 'cart.reorder');
  }
}
