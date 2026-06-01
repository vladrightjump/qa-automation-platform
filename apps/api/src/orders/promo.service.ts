import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, prisma } from '@qa/db';
import { AuditAction } from './constants';

export interface PromoApplyResult {
  code: string;
  discountCents: number;
  promoCodeId: string;
}

@Injectable()
export class PromoService {
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

  /** Pure discount math — percent-off or flat-off, never below zero. */
  computeDiscount(
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
   * Count the redemption and leave a ground-truth audit row, inside the
   * checkout transaction so tests can assert the side-effect without
   * trusting the order payload.
   */
  async recordRedemption(
    tx: Prisma.TransactionClient,
    userId: string,
    promo: PromoApplyResult,
    orderId: string,
  ) {
    await tx.promoCode.update({
      where: { id: promo.promoCodeId },
      data: { timesRedeemed: { increment: 1 } },
    });
    await tx.auditLog.create({
      data: {
        userId,
        action: AuditAction.PROMO_REDEEMED,
        entity: 'PromoCode',
        entityId: promo.promoCodeId,
        metadata: {
          code: promo.code,
          discountCents: promo.discountCents,
          orderId,
        } as Prisma.InputJsonValue,
      },
    });
  }
}
