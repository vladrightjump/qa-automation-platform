import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { prisma, upsertAdmin } from '@qa/db';
import { TestEndpointsGuard } from './test-endpoints.guard';

@ApiTags('test')
@UseGuards(TestEndpointsGuard)
@Controller('test')
export class TestController {
  /**
   * Wipes user-level data (users, carts, orders, audit log) but leaves
   * the deterministic product catalog intact. Re-seeds the admin user
   * so admin-only flows stay testable across resets.
   */
  @Post('reset')
  async reset() {
    await prisma.auditLog.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.user.deleteMany();
    await upsertAdmin(prisma);
    return { ok: true };
  }
}
