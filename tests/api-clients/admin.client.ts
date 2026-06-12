import {
  PagedProductsSchema,
  ProductSchema,
  type PagedProducts,
  type Product,
  type ProductCategory,
} from '@qa/contracts';
import { authHeader, expectOk, parseJson, type RequestContext } from './base';

export interface AdminProductInput {
  id: string;
  name: string;
  description?: string | null;
  priceCents: number;
  stock: number;
  category: ProductCategory;
  tags?: string[];
}

export class AdminClient {
  constructor(private readonly ctx: RequestContext) {}

  async listProducts(token: string, page = 1, pageSize = 20): Promise<PagedProducts> {
    const res = await this.ctx.request.get(
      `${this.ctx.baseUrl}/admin/products?page=${page}&pageSize=${pageSize}`,
      { headers: authHeader(token) },
    );
    return parseJson(res, PagedProductsSchema, 'admin.listProducts');
  }

  async createProduct(token: string, input: AdminProductInput): Promise<Product> {
    const res = await this.ctx.request.post(`${this.ctx.baseUrl}/admin/products`, {
      headers: authHeader(token),
      data: input,
    });
    return parseJson(res, ProductSchema, 'admin.createProduct');
  }

  async updateProduct(
    token: string,
    id: string,
    patch: Partial<AdminProductInput>,
  ): Promise<Product> {
    const res = await this.ctx.request.patch(
      `${this.ctx.baseUrl}/admin/products/${id}`,
      { headers: authHeader(token), data: patch },
    );
    return parseJson(res, ProductSchema, 'admin.updateProduct');
  }

  async deleteProduct(token: string, id: string): Promise<void> {
    const res = await this.ctx.request.delete(
      `${this.ctx.baseUrl}/admin/products/${id}`,
      { headers: authHeader(token) },
    );
    await expectOk(res, 'admin.deleteProduct');
  }
}
