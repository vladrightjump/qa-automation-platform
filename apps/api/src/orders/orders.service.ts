import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { OrderStatus, Prisma, prisma } from '@qa/db';
import type { CheckoutDto, PaymentMethod } from './dto';
import { AuditAction } from './constants';
import { maybeInjectFailure } from '../test/fault-injection';
import { getCartWithItems, notFoundFor } from '../common';

@Injectable()
export class OrdersService {
  /**
   * Checkout the user's cart. Wrapped in a single transaction so the
   * order, stock decrement, audit log row, and cart clear either all
   * land or none do — this is the side-effect surface tests assert on.
   */
  async checkout(userId: string, dto: CheckoutDto = {}) {
    const cart = await getCartWithItems(userId);
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

    // Optional address — must belong to user.
    if (dto.addressId) {
      const address = await prisma.address.findUnique({
        where: { id: dto.addressId },
      });
      if (!address || address.userId !== userId) {
        throw new BadRequestException(`Invalid addressId`);
      }
    }

    const totalCents = cart.items.reduce(
      (sum, i) => sum + i.product.priceCents * i.quantity,
      0,
    );
    const paymentMethod: PaymentMethod = dto.paymentMethod ?? 'CARD';

    return prisma.$transaction(async (tx) => {
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

      // Chaos seam — armed via POST /test/inject-failure?at=stock-decrement
      // &userId=<u>, gated by ENABLE_TEST_ENDPOINTS. Throwing here rolls
      // back the entire checkout transaction; in production builds the
      // call is a no-op.
      maybeInjectFailure('stock-decrement', userId);

      const order = await tx.order.create({
        data: {
          userId,
          status: OrderStatus.PAID,
          totalCents,
          paymentMethod,
          shippingAddressId: dto.addressId ?? null,
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
          action: AuditAction.ORDER_PAID,
          entity: 'Order',
          entityId: order.id,
          metadata: {
            totalCents,
            paymentMethod,
            itemCount: cart.items.length,
          } as Prisma.InputJsonValue,
        },
      });

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
    if (!order) throw notFoundFor('Order', id);
    if (order.userId !== userId) throw new ForbiddenException();
    return order;
  }

  async cancel(userId: string, id: string) {
    const order = await this.get(userId, id);
    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.PAID) {
      throw new BadRequestException(
        `Order ${id} cannot be cancelled in status ${order.status}`,
      );
    }
    return prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: { status: OrderStatus.CANCELLED },
        include: { items: true },
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: AuditAction.ORDER_CANCELLED,
          entity: 'Order',
          entityId: id,
        },
      });
      return updated;
    });
  }
}
