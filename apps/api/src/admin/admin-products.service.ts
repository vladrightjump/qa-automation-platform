import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { prisma } from '@qa/db';
import { Prisma } from '@qa/db';
import type { CreateProductDto, UpdateProductDto } from './dto';

@Injectable()
export class AdminProductsService {
  async list(page = 1, pageSize = 20) {
    const [items, total] = await Promise.all([
      prisma.product.findMany({
        orderBy: { id: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.product.count(),
    ]);
    return { items, total, page, pageSize };
  }

  async create(dto: CreateProductDto) {
    try {
      return await prisma.product.create({
        data: {
          id: dto.id,
          name: dto.name,
          description: dto.description ?? null,
          priceCents: dto.priceCents,
          stock: dto.stock,
          category: dto.category,
          tags: dto.tags ?? [],
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(`Product ${dto.id} already exists`);
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.ensureExists(id);
    return prisma.product.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.priceCents !== undefined ? { priceCents: dto.priceCents } : {}),
        ...(dto.stock !== undefined ? { stock: dto.stock } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.tags !== undefined ? { tags: dto.tags } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    // Defensive: if a product is referenced by order/cart items, blocking
    // delete is safer than cascading silently. The seeded baseline products
    // can be edited but not removed once an order references them.
    const orderRefs = await prisma.orderItem.count({ where: { productId: id } });
    if (orderRefs > 0) {
      throw new ConflictException(
        `Product ${id} is referenced by ${orderRefs} order item(s)`,
      );
    }
    await prisma.cartItem.deleteMany({ where: { productId: id } });
    await prisma.product.delete({ where: { id } });
    return { ok: true };
  }

  private async ensureExists(id: string): Promise<void> {
    const found = await prisma.product.findUnique({ where: { id } });
    if (!found) throw new NotFoundException(`Product ${id} not found`);
  }
}
