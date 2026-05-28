import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';

@Module({
  imports: [AuthModule],
  providers: [WishlistService],
  controllers: [WishlistController],
})
export class WishlistModule {}
