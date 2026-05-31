import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LoyaltyType, OrderStatus, Prisma, ReturnStatus, prisma } from '@qa/db';
import type { CheckoutDto, PaymentMethod } from './dto';

// Loyalty: customers earn this fraction of the charged total back as store
// credit (1 point = 1¢). Kept as a constant so tests can reason about it.
const LOYALTY_EARN_RATE = 0.05;

export interface PromoApplyResult {
  code: string;
  discountCents: number;
  promoCodeId: string;
}

@Injectable()
export class OrdersService {
  /**
   * Discoverable promo codes for the storefront "available deals" panel.
   * Only featured + active + unexpired + not-exhausted codes are returned,
   * and internal fields (timesRedeemed/maxRedemptions) are never exposed.
   */
  async listPromoCodes() {
    const now = new Date();
    const promos = await prisma.promoCode.findMany({
      where: {
        featured: true,
        active: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { code: 'asc' },
    });
    return promos
      .filter((p) => p.maxRedemptions == null || p.timesRedeemed < p.maxRedemptions)
      .map((p) => ({
        code: p.code,
        description: p.description,
        percentOff: p.percentOff,
        flatOffCents: p.flatOffCents,
        minSpendCents: p.minSpendCents,
      }));
  }

  /**
   * Validate a promo code against the user's current cart total.
   * Pure — does not mutate state. Returns the computed discount in
   * cents. Throws 400/404 on invalid/expired/inactive codes, when the
   * cart subtotal is below the code's minimum spend, or when the code's
   * redemption limit is exhausted.
   */
  async previewPromo(userId: string, rawCode: string): Promise<PromoApplyResult> {
    const code = rawCode.trim().toUpperCase();
    const promo = await prisma.promoCode.findUnique({ where: { code } });
    if (!promo) {
      throw new NotFoundException(`Promo code ${code} not found`);
    }
    if (!promo.active) {
      throw new BadRequestException(`Promo code ${code} is inactive`);
    }
    if (promo.expiresAt && promo.expiresAt < new Date()) {
      throw new BadRequestException(`Promo code ${code} has expired`);
    }
    if (promo.maxRedemptions != null && promo.timesRedeemed >= promo.maxRedemptions) {
      throw new BadRequestException(`Promo code ${code} has been fully redeemed`);
    }

    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } },
    });
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }
    const total = cart.items.reduce(
      (sum, i) => sum + i.product.priceCents * i.quantity,
      0,
    );
    if (total < promo.minSpendCents) {
      throw new BadRequestException(
        `Promo code ${code} requires a minimum spend of ${promo.minSpendCents} cents`,
      );
    }
    const discountCents = this.computeDiscount(promo, total);
    return { code: promo.code, discountCents, promoCodeId: promo.id };
  }

  private computeDiscount(
    promo: { percentOff: number | null; flatOffCents: number | null },
    total: number,
  ): number {
    if (promo.percentOff != null) {
      return Math.min(total, Math.floor((total * promo.percentOff) / 100));
    }
    if (promo.flatOffCents != null) {
      return Math.min(total, promo.flatOffCents);
    }
    return 0;
  }

  /**
   * Checkout the user's cart. Wrapped in a single transaction so the
   * order, stock decrement, audit log row, and cart clear either all
   * land or none do — this is the side-effect surface tests assert on.
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
      promoResult = await this.previewPromo(userId, dto.promoCode);
    }

    const subtotalCents = cart.items.reduce(
      (sum, i) => sum + i.product.priceCents * i.quantity,
      0,
    );
    const discountCents = promoResult?.discountCents ?? 0;
    const afterPromoCents = Math.max(0, subtotalCents - discountCents);

    // Optional loyalty redemption — re-validated server-side against the
    // ledger balance; we only ever redeem what the order actually needs.
    let redeemCents = 0;
    if (dto.redeemPoints && dto.redeemPoints > 0) {
      const balance = await this.loyaltyBalance(userId);
      if (dto.redeemPoints > balance) {
        throw new BadRequestException(
          `Cannot redeem ${dto.redeemPoints} points — balance is ${balance}`,
        );
      }
      redeemCents = Math.min(dto.redeemPoints, afterPromoCents);
    }

    const totalCents = Math.max(0, afterPromoCents - redeemCents);
    const earnedPoints = Math.floor(totalCents * LOYALTY_EARN_RATE);
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
          action: 'ORDER_PAID',
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

      // Count the redemption and leave a ground-truth audit row so tests
      // can assert the side-effect without trusting the order payload.
      if (promoResult) {
        await tx.promoCode.update({
          where: { id: promoResult.promoCodeId },
          data: { timesRedeemed: { increment: 1 } },
        });
        await tx.auditLog.create({
          data: {
            userId,
            action: 'PROMO_REDEEMED',
            entity: 'PromoCode',
            entityId: promoResult.promoCodeId,
            metadata: {
              code: promoResult.code,
              discountCents: promoResult.discountCents,
              orderId: order.id,
            } as Prisma.InputJsonValue,
          },
        });
      }

      // Loyalty redemption (store credit spent on this order).
      if (redeemCents > 0) {
        await tx.loyaltyTransaction.create({
          data: {
            userId,
            orderId: order.id,
            points: -redeemCents,
            type: LoyaltyType.REDEEM,
          },
        });
        await tx.auditLog.create({
          data: {
            userId,
            action: 'LOYALTY_REDEEMED',
            entity: 'Order',
            entityId: order.id,
            metadata: { redeemCents } as Prisma.InputJsonValue,
          },
        });
      }

      // Loyalty earn (store credit accrued from this order).
      if (earnedPoints > 0) {
        await tx.loyaltyTransaction.create({
          data: {
            userId,
            orderId: order.id,
            points: earnedPoints,
            type: LoyaltyType.EARN,
          },
        });
        await tx.auditLog.create({
          data: {
            userId,
            action: 'LOYALTY_EARNED',
            entity: 'Order',
            entityId: order.id,
            metadata: { earnedPoints } as Prisma.InputJsonValue,
          },
        });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return order;
    });
  }

  /** Signed sum of the loyalty ledger (1 point = 1¢ of store credit). */
  async loyaltyBalance(userId: string): Promise<number> {
    const agg = await prisma.loyaltyTransaction.aggregate({
      where: { userId },
      _sum: { points: true },
    });
    return agg._sum.points ?? 0;
  }

  async getLoyalty(userId: string) {
    const [balancePoints, transactions] = await Promise.all([
      this.loyaltyBalance(userId),
      prisma.loyaltyTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { balancePoints, transactions };
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

  /**
   * Request a return/RMA against an order. Allowed only when the order is
   * PAID or FULFILLED, owned by the user, and has no open (non-REJECTED)
   * return already. Status + audit only — no payment or stock side-effects.
   */
  async requestReturn(userId: string, orderId: string, reason: string) {
    const order = await this.get(userId, orderId); // 404 + ownership guard
    if (
      order.status !== OrderStatus.PAID &&
      order.status !== OrderStatus.FULFILLED
    ) {
      throw new BadRequestException(
        `Order ${orderId} cannot be returned in status ${order.status}`,
      );
    }
    const open = await prisma.return.findFirst({
      where: {
        orderId,
        status: { not: ReturnStatus.REJECTED },
      },
    });
    if (open) {
      throw new BadRequestException(
        `Order ${orderId} already has an open return`,
      );
    }
    return prisma.$transaction(async (tx) => {
      const ret = await tx.return.create({
        data: { orderId, userId, reason, status: ReturnStatus.REQUESTED },
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: 'RETURN_REQUESTED',
          entity: 'Return',
          entityId: ret.id,
          metadata: { orderId, reason } as Prisma.InputJsonValue,
        },
      });
      return ret;
    });
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
          action: 'ORDER_CANCELLED',
          entity: 'Order',
          entityId: id,
        },
      });
      return updated;
    });
  }
}
