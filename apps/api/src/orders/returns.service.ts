import { BadRequestException, Injectable } from '@nestjs/common';
import { OrderStatus, Prisma, ReturnStatus, prisma } from '@qa/db';
import { AuditAction } from './constants';
import { OrdersService } from './orders.service';

@Injectable()
export class ReturnsService {
  constructor(private readonly orders: OrdersService) {}

  /**
   * Request a return/RMA against an order. Allowed only when the order is
   * PAID or FULFILLED, owned by the user, and has no open (non-REJECTED)
   * return already. Status + audit only — no payment or stock side-effects.
   */
  async requestReturn(userId: string, orderId: string, reason: string) {
    const order = await this.orders.get(userId, orderId); // 404 + ownership guard
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
          action: AuditAction.RETURN_REQUESTED,
          entity: 'Return',
          entityId: ret.id,
          metadata: { orderId, reason } as Prisma.InputJsonValue,
        },
      });
      return ret;
    });
  }
}
