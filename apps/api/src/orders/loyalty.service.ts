import { BadRequestException, Injectable } from '@nestjs/common';
import { LoyaltyType, Prisma, prisma } from '@qa/db';
import {
  clampRedemption,
  earnedPoints as earnedPointsPure,
} from '@qa/contracts';
import { AuditAction } from './constants';

@Injectable()
export class LoyaltyService {
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

  /**
   * Re-validate a redemption request server-side against the ledger balance
   * and clamp it to what the order actually needs. Returns the cents to
   * redeem (0 when nothing is requested). Throws 400 if over balance.
   */
  async prepareRedemption(
    userId: string,
    requestedPoints: number | undefined,
    afterPromoCents: number,
  ): Promise<number> {
    if (!requestedPoints || requestedPoints <= 0) return 0;
    const balance = await this.loyaltyBalance(userId);
    if (requestedPoints > balance) {
      throw new BadRequestException(
        `Cannot redeem ${requestedPoints} points — balance is ${balance}`,
      );
    }
    return clampRedemption(requestedPoints, afterPromoCents);
  }

  /** Points earned (store credit accrued) from a charged total. */
  earnedPoints(totalCents: number): number {
    return earnedPointsPure(totalCents);
  }

  /** Loyalty redemption ledger + audit row (store credit spent), inside txn. */
  async recordRedeem(
    tx: Prisma.TransactionClient,
    userId: string,
    orderId: string,
    redeemCents: number,
  ) {
    await tx.loyaltyTransaction.create({
      data: {
        userId,
        orderId,
        points: -redeemCents,
        type: LoyaltyType.REDEEM,
      },
    });
    await tx.auditLog.create({
      data: {
        userId,
        action: AuditAction.LOYALTY_REDEEMED,
        entity: 'Order',
        entityId: orderId,
        metadata: { redeemCents } as Prisma.InputJsonValue,
      },
    });
  }

  /** Loyalty earn ledger + audit row (store credit accrued), inside txn. */
  async recordEarn(
    tx: Prisma.TransactionClient,
    userId: string,
    orderId: string,
    earnedPoints: number,
  ) {
    await tx.loyaltyTransaction.create({
      data: {
        userId,
        orderId,
        points: earnedPoints,
        type: LoyaltyType.EARN,
      },
    });
    await tx.auditLog.create({
      data: {
        userId,
        action: AuditAction.LOYALTY_EARNED,
        entity: 'Order',
        entityId: orderId,
        metadata: { earnedPoints } as Prisma.InputJsonValue,
      },
    });
  }
}
