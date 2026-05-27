import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma, prisma } from '@qa/db';

@Injectable()
export class OrdersService {
  /**
   * Checkout the user's cart. Wrapped in a single transaction so the
   * order, stock decrement, audit log row, and cart clear either all
   * land or none do — this is the side-effect surface tests assert on.
   */
  async checkout(userId: string) {
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } },
    });
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Upfront stock check for a clear error before opening the txn.
    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${item.product.id}: have ${item.product.stock}, need ${item.quantity}`,
        );
      }
    }

    const totalCents = cart.items.reduce(
      (sum, i) => sum + i.product.priceCents * i.quantity,
      0,
    );

    return prisma.$transaction(async (tx) => {
      // Conditional decrement — only succeeds while stock is still sufficient.
      for (const item of cart.items) {
        const updated = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (updated.count !== 1) {
          throw new BadRequestException(
            `Race on stock for ${item.productId} — please retry`,
          );
        }
      }

      const order = await tx.order.create({
        data: {
          userId,
          status: OrderStatus.PAID,
          totalCents,
          items: {
            create: cart.items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              unitPriceCents: i.product.priceCents,
            })),
          },
        },
        include: { items: true },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'ORDER_PAID',
          entity: 'Order',
          entityId: order.id,
          metadata: {
            totalCents,
            itemCount: cart.items.length,
          } as Prisma.InputJsonValue,
        },
      });

      // Clear the cart (keep the cart row itself).
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return order;
    });
  }

  list(userId: string) {
    return prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
  }

  async get(userId: string, id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    if (order.userId !== userId) throw new ForbiddenException();
    return order;
  }
}
