import { OrderListSchema, OrderSchema, type Order } from '@qa/contracts';
import { authHeader, parseJson, type RequestContext } from './base';

export class OrdersClient {
  constructor(private readonly ctx: RequestContext) {}

  async list(token: string): Promise<Order[]> {
    const res = await this.ctx.request.get(`${this.ctx.baseUrl}/orders`, {
      headers: authHeader(token),
    });
    return parseJson(res, OrderListSchema, 'orders.list');
  }

  async get(token: string, id: string): Promise<Order> {
    const res = await this.ctx.request.get(`${this.ctx.baseUrl}/orders/${id}`, {
      headers: authHeader(token),
    });
    return parseJson(res, OrderSchema, `orders.get(${id})`);
  }

  async cancel(token: string, id: string): Promise<Order> {
    const res = await this.ctx.request.post(
      `${this.ctx.baseUrl}/orders/${id}/cancel`,
      { headers: authHeader(token) },
    );
    return parseJson(res, OrderSchema, `orders.cancel(${id})`);
  }
}
