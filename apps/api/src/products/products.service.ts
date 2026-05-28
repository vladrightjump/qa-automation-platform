import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@qa/db';
import type { Prisma } from '@qa/db';
import type { ListProductsDto, ProductSort } from './dto';

const SORT_MAP: Record<ProductSort, Prisma.ProductOrderByWithRelationInput> = {
  name_asc: { name: 'asc' },
  name_desc: { name: 'desc' },
  price_asc: { priceCents: 'asc' },
  price_desc: { priceCents: 'desc' },
  newest: { createdAt: 'desc' },
};

@Injectable()
export class ProductsService {
  async list(query: ListProductsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 12;
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

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: SORT_MAP[sort],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async get(id: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }
}
