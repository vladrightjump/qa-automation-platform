import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StockAlertsController } from './stock-alerts.controller';
import { StockAlertsService } from './stock-alerts.service';

@Module({
  imports: [AuthModule],
  providers: [StockAlertsService],
  controllers: [StockAlertsController],
})
export class StockAlertsModule {}
