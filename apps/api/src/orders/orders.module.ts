import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrdersController, PromoController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PromoService } from './promo.service';
import { LoyaltyService } from './loyalty.service';
import { ReturnsService } from './returns.service';

@Module({
  imports: [AuthModule],
  providers: [OrdersService, PromoService, LoyaltyService, ReturnsService],
  controllers: [OrdersController, PromoController],
})
export class OrdersModule {}
