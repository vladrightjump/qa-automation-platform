import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, ReturnStatus, prisma } from '@qa/db';
import type { Prisma } from '@qa/db';

@Injectable()
export class AdminOrdersService {
  async list(status: OrderStatus | undefined, page = 1, pageSize = 20) {
    const where: Prisma.OrderWhereInput = status ? { status } : {};
    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          items: true,
          returns: { orderBy: { createdAt: 'desc' } },
        },
      }),
      prisma.order.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  /** PAID → FULFILLED. The only transition that sets FULFILLED. */
  async fulfill(orderId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (order.status !== OrderStatus.PAID) {
      throw new BadRequestException(
        `Order ${orderId} cannot be fulfilled in status ${order.status}`,
      );
    }
    return prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.FULFILLED },
        include: { items: true, returns: { orderBy: { createdAt: 'desc' } } },
      });
      await tx.auditLog.create({
        data: {
          action: 'ORDER_FULFILLED',
          entity: 'Order',
          entityId: orderId,
        },
      });
      return updated;
    });
  }

  /** REQUESTED → APPROVED. */
  approveReturn(returnId: string) {
    return this.transitionReturn(returnId, {
      from: [ReturnStatus.REQUESTED],
      to: ReturnStatus.APPROVED,
      action: 'RETURN_APPROVED',
    });
  }

  /** REQUESTED → REJECTED. */
  rejectReturn(returnId: string) {
    return this.transitionReturn(returnId, {
      from: [ReturnStatus.REQUESTED],
      to: ReturnStatus.REJECTED,
      action: 'RETURN_REJECTED',
    });
  }

  /**
   * APPROVED → REFUNDED. Records the refund amount as the order total
   * (status + audit only — no payment integration).
   */
  async refundReturn(returnId: string) {
    const ret = await prisma.return.findUnique({
      where: { id: returnId },
      include: { order: true },
    });
    if (!ret) throw new NotFoundException(`Return ${returnId} not found`);
    if (ret.status !== ReturnStatus.APPROVED) {
      throw new BadRequestException(
        `Return ${returnId} must be APPROVED before refund (is ${ret.status})`,
      );
    }
    const refundCents = ret.order.totalCents;
    return prisma.$transaction(async (tx) => {
      const updated = await tx.return.update({
        where: { id: returnId },
        data: { status: ReturnStatus.REFUNDED, refundCents },
      });
      await tx.auditLog.create({
        data: {
          action: 'RETURN_REFUNDED',
          entity: 'Return',
          entityId: returnId,
          metadata: {
            orderId: ret.orderId,
            refundCents,
          } as Prisma.InputJsonValue,
        },
      });
      return updated;
    });
  }

  private async transitionReturn(
    returnId: string,
    opts: { from: ReturnStatus[]; to: ReturnStatus; action: string },
  ) {
    const ret = await prisma.return.findUnique({ where: { id: returnId } });
    if (!ret) throw new NotFoundException(`Return ${returnId} not found`);
    if (!opts.from.includes(ret.status)) {
      throw new BadRequestException(
        `Return ${returnId} cannot move to ${opts.to} from ${ret.status}`,
      );
    }
    return prisma.$transaction(async (tx) => {
      const updated = await tx.return.update({
        where: { id: returnId },
        data: { status: opts.to },
      });
      await tx.auditLog.create({
        data: {
          action: opts.action,
          entity: 'Return',
          entityId: returnId,
          metadata: { orderId: ret.orderId } as Prisma.InputJsonValue,
        },
      });
      return updated;
    });
  }
}
