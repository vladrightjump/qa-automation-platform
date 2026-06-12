import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminProductsController } from './admin-products.controller';
import { AdminProductsService } from './admin-products.service';

@Module({
  imports: [AuthModule],
  providers: [AdminProductsService],
  controllers: [AdminProductsController],
})
export class AdminModule {}
