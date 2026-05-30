import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { prisma } from '@qa/db';

@Injectable()
export class StockAlertsService {
  /**
   * Subscribe to a back-in-stock alert. Only allowed while the product is
   * out of stock. Idempotent on the (userId, productId) unique key; a
   * re-subscribe re-arms a previously-notified alert.
   */
  async subscribe(userId: string, productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);
    if (product.stock > 0) {
      throw new BadRequestException(`Product ${productId} is in stock`);
    }
    return prisma.stockAlert.upsert({
      where: { userId_productId: { userId, productId } },
      update: { notified: false },
      create: { userId, productId },
    });
  }

  async unsubscribe(userId: string, productId: string) {
    await prisma.stockAlert.deleteMany({ where: { userId, productId } });
    return { ok: true as const };
  }

  list(userId: string) {
    return prisma.stockAlert.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
