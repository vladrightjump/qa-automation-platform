import { Injectable } from '@nestjs/common';
import { prisma } from '@qa/db';
import { Prisma } from '@qa/db';
import type { CreateProductDto, UpdateProductDto } from './dto';
import { CacheService } from '../cache/cache.service';
import { conflictFor, notFoundFor, paginate } from '../common';

@Injectable()
export class AdminProductsService {
  constructor(private readonly cache: CacheService) {}

  list(page = 1, pageSize = 20) {
    return paginate(prisma.product, page, pageSize, {
      orderBy: { id: 'asc' } as Prisma.ProductOrderByWithRelationInput,
    });
  }

  async create(dto: CreateProductDto) {
    try {
      const created = await prisma.product.create({
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
      this.cache.invalidatePrefix('/products');
      this.cache.invalidatePrefix('/admin/metrics');
      return created;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw conflictFor(`Product ${dto.id} already exists`);
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.ensureExists(id);
    const data: Prisma.ProductUpdateInput = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.priceCents !== undefined ? { priceCents: dto.priceCents } : {}),
      ...(dto.stock !== undefined ? { stock: dto.stock } : {}),
      ...(dto.category !== undefined ? { category: dto.category } : {}),
      ...(dto.tags !== undefined ? { tags: dto.tags } : {}),
    };

    // Back-in-stock transition: restocking a product from 0 → >0 fulfils any
    // pending alerts. The "notification" is a ground-truth audit row (no email
    // infra), and each alert is flipped to notified so it fires only once.
    const restocked =
      existing.stock === 0 && dto.stock !== undefined && dto.stock > 0;

    if (!restocked) {
      const updated = await prisma.product.update({ where: { id }, data });
      this.cache.invalidatePrefix('/products');
      this.cache.invalidatePrefix('/admin/metrics');
      return updated;
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({ where: { id }, data });
      const pending = await tx.stockAlert.findMany({
        where: { productId: id, notified: false },
      });
      if (pending.length > 0) {
        await tx.stockAlert.updateMany({
          where: { productId: id, notified: false },
          data: { notified: true },
        });
        await tx.auditLog.createMany({
          data: pending.map((alert) => ({
            userId: alert.userId,
            action: 'STOCK_ALERT_NOTIFIED',
            entity: 'StockAlert',
            entityId: alert.id,
            metadata: { productId: id } as Prisma.InputJsonValue,
          })),
        });
      }
      return updated;
    });
    this.cache.invalidatePrefix('/products');
    this.cache.invalidatePrefix('/admin/metrics');
    return result;
  }

  async remove(id: string) {
    await this.ensureExists(id);
    // Defensive: if a product is referenced by order/cart items, blocking
    // delete is safer than cascading silently. The seeded baseline products
    // can be edited but not removed once an order references them.
    const orderRefs = await prisma.orderItem.count({ where: { productId: id } });
    if (orderRefs > 0) {
      throw conflictFor(
        `Product ${id} is referenced by ${orderRefs} order item(s)`,
      );
    }
    await prisma.cartItem.deleteMany({ where: { productId: id } });
    await prisma.product.delete({ where: { id } });
    this.cache.invalidatePrefix('/products');
    this.cache.invalidatePrefix('/admin/metrics');
    return { ok: true };
  }

  private async ensureExists(id: string) {
    const found = await prisma.product.findUnique({ where: { id } });
    if (!found) throw notFoundFor('Product', id);
    return found;
  }
}
