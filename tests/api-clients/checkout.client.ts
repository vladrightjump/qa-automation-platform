import {
  AddressSchema,
  OrderSchema,
  z,
  type Address,
  type Order,
  type PaymentMethod,
} from '@qa/contracts';
import { authHeader, expectOk, parseJson, type RequestContext } from './base';

const AddressListSchema = z.array(AddressSchema);

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

export class CheckoutClient {
  constructor(private readonly ctx: RequestContext) {}

  async checkout(token: string, input: CheckoutInput = {}): Promise<Order> {
    const res = await this.ctx.request.post(`${this.ctx.baseUrl}/orders`, {
      headers: authHeader(token),
      data: input,
    });
    return parseJson(res, OrderSchema, 'checkout');
  }

  async listAddresses(token: string): Promise<Address[]> {
    const res = await this.ctx.request.get(`${this.ctx.baseUrl}/addresses`, {
      headers: authHeader(token),
    });
    return parseJson(res, AddressListSchema, 'checkout.listAddresses');
  }

  async createAddress(token: string, input: AddressInput): Promise<Address> {
    const res = await this.ctx.request.post(`${this.ctx.baseUrl}/addresses`, {
      headers: authHeader(token),
      data: input,
    });
    return parseJson(res, AddressSchema, 'checkout.createAddress');
  }

  async updateAddress(
    token: string,
    id: string,
    patch: Partial<AddressInput>,
  ): Promise<Address> {
    const res = await this.ctx.request.patch(`${this.ctx.baseUrl}/addresses/${id}`, {
      headers: authHeader(token),
      data: patch,
    });
    return parseJson(res, AddressSchema, 'checkout.updateAddress');
  }

  async deleteAddress(token: string, id: string): Promise<void> {
    const res = await this.ctx.request.delete(`${this.ctx.baseUrl}/addresses/${id}`, {
      headers: authHeader(token),
    });
    await expectOk(res, 'checkout.deleteAddress');
  }
}
