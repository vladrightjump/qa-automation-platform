import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminProductsController } from './admin-products.controller';
import { AdminProductsService } from './admin-products.service';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminOrdersService } from './admin-orders.service';
import { AdminMetricsController } from './metrics/admin-metrics.controller';
import { AdminMetricsService } from './metrics/admin-metrics.service';

@Module({
  imports: [AuthModule],
  providers: [AdminProductsService, AdminOrdersService, AdminMetricsService],
  controllers: [
    AdminProductsController,
    AdminOrdersController,
    AdminMetricsController,
  ],
})
export class AdminModule {}
