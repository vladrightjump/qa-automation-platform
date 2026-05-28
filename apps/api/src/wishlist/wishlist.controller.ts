import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard, type AuthedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { WishlistService } from './wishlist.service';
import { AddWishlistItemDto } from './dto';

@ApiTags('wishlist')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlist: WishlistService) {}

  @Get()
  get(@CurrentUser() user: AuthedUser) {
    return this.wishlist.get(user.id);
  }

  @Post('items')
  add(@CurrentUser() user: AuthedUser, @Body() dto: AddWishlistItemDto) {
    return this.wishlist.add(user.id, dto.productId);
  }

  @Delete('items/:productId')
  remove(
    @CurrentUser() user: AuthedUser,
    @Param('productId') productId: string,
  ) {
    return this.wishlist.remove(user.id, productId);
  }
}
