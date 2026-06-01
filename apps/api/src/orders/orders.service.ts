import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma, prisma } from '@qa/db';
import type { CheckoutDto, PaymentMethod } from './dto';
import { AuditAction } from './constants';
import { PromoService, type PromoApplyResult } from './promo.service';
import { LoyaltyService } from './loyalty.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly promo: PromoService,
    private readonly loyalty: LoyaltyService,
  ) {}

  /**
   * Checkout the user's cart. Wrapped in a single transaction so the
   * order, stock decrement, audit log row, and cart clear either all
   * land or none do — this is the side-effect surface tests assert on.
   * Promo and loyalty side-effects are delegated to their collaborators but
   * still run inside the same transaction.
   */
  async checkout(userId: string, dto: CheckoutDto = {}) {
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

    // Optional address — must belong to user.
    if (dto.addressId) {
      const address = await prisma.address.findUnique({
        where: { id: dto.addressId },
      });
      if (!address || address.userId !== userId) {
        throw new BadRequestException(`Invalid addressId`);
      }
    }

    // Optional promo — re-validates server-side; the client-applied
    // discount is not trusted.
    let promoResult: PromoApplyResult | null = null;
    if (dto.promoCode) {
      promoResult = await this.promo.previewPromo(userId, dto.promoCode);
    }

    const subtotalCents = cart.items.reduce(
      (sum, i) => sum + i.product.priceCents * i.quantity,
      0,
    );
    const discountCents = promoResult?.discountCents ?? 0;
    const afterPromoCents = Math.max(0, subtotalCents - discountCents);

    // Optional loyalty redemption — re-validated server-side against the
    // ledger balance; we only ever redeem what the order actually needs.
    const redeemCents = await this.loyalty.prepareRedemption(
      userId,
      dto.redeemPoints,
      afterPromoCents,
    );

    const totalCents = Math.max(0, afterPromoCents - redeemCents);
    const earnedPoints = this.loyalty.earnedPoints(totalCents);
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

      const order = await tx.order.create({
        data: {
          userId,
          status: OrderStatus.PAID,
          totalCents,
          discountCents,
          paymentMethod,
          shippingAddressId: dto.addressId ?? null,
          promoCodeId: promoResult?.promoCodeId ?? null,
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
            subtotalCents,
            discountCents,
            paymentMethod,
            promoCode: promoResult?.code ?? null,
            itemCount: cart.items.length,
          } as Prisma.InputJsonValue,
        },
      });

      if (promoResult) {
        await this.promo.recordRedemption(tx, userId, promoResult, order.id);
      }
      if (redeemCents > 0) {
        await this.loyalty.recordRedeem(tx, userId, order.id, redeemCents);
      }
      if (earnedPoints > 0) {
        await this.loyalty.recordEarn(tx, userId, order.id, earnedPoints);
      }

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
      include: {
        items: true,
        returns: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!order) throw new NotFoundException(`Order ${id} not found`);
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
