import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminProductsController } from './admin-products.controller';
import { AdminProductsService } from './admin-products.service';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminOrdersService } from './admin-orders.service';

@Module({
  imports: [AuthModule],
  providers: [AdminProductsService, AdminOrdersService],
  controllers: [AdminProductsController, AdminOrdersController],
})
export class AdminModule {}
