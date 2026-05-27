import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@qa/db';

@Injectable()
export class ProductsService {
  list() {
    return prisma.product.findMany({ orderBy: { id: 'asc' } });
  }

  async get(id: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }
}
