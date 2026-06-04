import { Controller, Get, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../../auth/auth.guard';
import { Cacheable, CacheInterceptor } from '../../cache/cache.interceptor';
import { AdminMetricsService } from './admin-metrics.service';
import { SalesMetricsQueryDto } from './dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@UseInterceptors(CacheInterceptor)
@Controller('admin/metrics')
export class AdminMetricsController {
  constructor(private readonly metrics: AdminMetricsService) {}

  // 30s TTL: the aggregation is expensive and the data only ages with new
  // orders. Admin product mutations call cache.invalidatePrefix('/admin/metrics')
  // so reviewers see a fresh number after edits.
  @Get('sales')
  @Cacheable(30_000)
  sales(@Query() query: SalesMetricsQueryDto) {
    return this.metrics.getSalesMetrics(query.from, query.to);
  }
}
