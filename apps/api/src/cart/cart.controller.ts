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
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto';

@ApiTags('cart')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  view(@CurrentUser() user: AuthedUser) {
    return this.cart.view(user.id);
  }

  @Post('items')
  add(@CurrentUser() user: AuthedUser, @Body() dto: AddCartItemDto) {
    return this.cart.addItem(user.id, dto.productId, dto.quantity);
  }

  @Delete('items/:productId')
  remove(@CurrentUser() user: AuthedUser, @Param('productId') productId: string) {
    return this.cart.removeItem(user.id, productId);
  }
}
