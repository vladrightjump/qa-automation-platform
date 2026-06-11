import { Injectable } from '@nestjs/common';
import { prisma } from '@qa/db';
import type { Prisma } from '@qa/db';
import type { ListProductsDto, ProductSort } from './dto';
import { notFoundFor, paginate } from '../common';

const SORT_MAP: Record<ProductSort, Prisma.ProductOrderByWithRelationInput> = {
  name_asc: { name: 'asc' },
  name_desc: { name: 'desc' },
  price_asc: { priceCents: 'asc' },
  price_desc: { priceCents: 'desc' },
  newest: { createdAt: 'desc' },
};

@Injectable()
export class ProductsService {
  list(query: ListProductsDto) {
    const sort = query.sort ?? 'name_asc';

    const where: Prisma.ProductWhereInput = {};
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    if (query.category && query.category.length > 0) {
      where.category = { in: query.category };
    }
    if (query.minPriceCents != null || query.maxPriceCents != null) {
      where.priceCents = {};
      if (query.minPriceCents != null) where.priceCents.gte = query.minPriceCents;
      if (query.maxPriceCents != null) where.priceCents.lte = query.maxPriceCents;
    }

    return paginate(prisma.product, query.page, query.pageSize, {
      where,
      orderBy: SORT_MAP[sort],
    });
  }

  async get(id: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw notFoundFor('Product', id);
    return product;
  }
}
