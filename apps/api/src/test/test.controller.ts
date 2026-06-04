import { Body, Controller, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  prisma,
  refreshRecommendationView,
  seedBulkProducts,
  upsertAdmin,
  upsertPromoCodes,
} from '@qa/db';
import { TestEndpointsGuard } from './test-endpoints.guard';
import { BulkSeedProductsDto } from './dto';
import { CacheService } from '../cache/cache.service';
import { clearFaultInjection, setFaultStage } from './fault-injection';

@ApiTags('test')
@UseGuards(TestEndpointsGuard)
@Controller('test')
export class TestController {
  constructor(private readonly cache: CacheService) {}

  /**
   * Wipes user-level data (users, carts, orders, audit log) but leaves
   * the deterministic product catalog intact. Re-seeds the admin user
   * so admin-only flows stay testable across resets.
   */
  @Post('reset')
  async reset() {
    clearFaultInjection();
    await prisma.auditLog.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.wishlistItem.deleteMany();
    await prisma.wishlist.deleteMany();
    await prisma.review.deleteMany();
    await prisma.address.deleteMany();
    await prisma.user.deleteMany();
    await upsertAdmin(prisma);
    await upsertPromoCodes(prisma);
    this.cache.clear();
    return { ok: true };
  }

  /**
   * Arms a one-shot failure injection at the named stage. The next call
   * through that stage throws and auto-clears the flag, so a test that
   * crashes after arming can't poison the next run. `?at=` (empty) clears.
   * Currently the only consumer is OrdersService.checkout at the
   * `stock-decrement` stage.
   */
  @Post('inject-failure')
  injectFailure(@Query('at') at?: string) {
    const stage = at && at.length > 0 ? at : null;
    setFaultStage(stage);
    return { ok: true, at: stage };
  }

  /**
   * Bulk-seeds synthetic products for the perf suite. Deterministic per
   * (count, rngSeed) so relevance + percentile assertions stay stable.
   * Idempotent: re-running with the same params is a no-op.
   */
  @Post('bulk-seed-products')
  async bulkSeedProducts(@Body() dto: BulkSeedProductsDto) {
    const result = await seedBulkProducts(prisma, dto.count, dto.rngSeed ?? 42);
    this.cache.invalidatePrefix('/products');
    return result;
  }

  /**
   * Refreshes the RecommendationView materialized view. Called by tests
   * that seed new paid orders and want the collaborative signal to
   * reflect them before asserting on /recommendations.
   */
  @Post('refresh-recommendation-view')
  async refreshRecommendationView() {
    await refreshRecommendationView(prisma);
    return { ok: true };
  }
}
