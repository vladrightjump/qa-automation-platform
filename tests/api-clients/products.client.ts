import {
  PagedProductsSchema,
  ProductSchema,
  type PagedProducts,
  type Product,
  type ProductCategory,
  type ProductSort,
} from '@qa/contracts';
import { parseJson, type RequestContext } from './base';

export interface ListProductsQuery {
  q?: string;
  category?: ProductCategory[];
  minPriceCents?: number;
  maxPriceCents?: number;
  sort?: ProductSort;
  page?: number;
  pageSize?: number;
}

function buildQuery(query: ListProductsQuery): string {
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

export class ProductsClient {
  constructor(private readonly ctx: RequestContext) {}

  async list(query: ListProductsQuery = {}): Promise<PagedProducts> {
    const res = await this.ctx.request.get(
      `${this.ctx.baseUrl}/products${buildQuery(query)}`,
    );
    return parseJson(res, PagedProductsSchema, 'products.list');
  }

  async get(id: string): Promise<Product> {
    const res = await this.ctx.request.get(`${this.ctx.baseUrl}/products/${id}`);
    return parseJson(res, ProductSchema, `products.get(${id})`);
  }
}
