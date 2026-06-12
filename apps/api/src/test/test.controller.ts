import {
  BadRequestException,
  Controller,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { prisma, upsertAdmin } from '@qa/db';
import { TestEndpointsGuard } from './test-endpoints.guard';
import { CacheService } from '../cache/cache.service';
import { clearFaultInjection, setFaultStage } from './fault-injection';

@ApiTags('test')
@UseGuards(TestEndpointsGuard)
@Controller('test')
export class TestController {
  constructor(private readonly cache: CacheService) {}

  /**
   * Wipes user-level data but leaves the deterministic product catalog
   * intact. Re-seeds the admin user so admin-only flows stay testable
   * across resets.
   */
  @Post('reset')
  async reset() {
    clearFaultInjection();
    await prisma.auditLog.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.address.deleteMany();
    await prisma.user.deleteMany();
    await upsertAdmin(prisma);
    this.cache.clear();
    return { ok: true };
  }

  @Post('inject-failure')
  injectFailure(
    @Query('at') at?: string,
    @Query('userId') userId?: string,
  ) {
    if (!userId) {
      throw new BadRequestException('userId query param is required');
    }
    const stage = at && at.length > 0 ? at : null;
    setFaultStage(userId, stage);
    return { ok: true, at: stage, userId };
  }
}
