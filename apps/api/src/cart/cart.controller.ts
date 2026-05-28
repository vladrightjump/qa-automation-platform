import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard, type AuthedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CartService } from './cart.service';
import { AddCartItemDto, ReorderCartDto, UpdateCartItemDto } from './dto';

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

  @Patch('items/:productId')
  update(
    @CurrentUser() user: AuthedUser,
    @Param('productId') productId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cart.updateItem(user.id, productId, dto.quantity);
  }

  @Patch('reorder')
  reorder(@CurrentUser() user: AuthedUser, @Body() dto: ReorderCartDto) {
    return this.cart.reorder(user.id, dto.order);
  }

  @Delete('items/:productId')
  remove(@CurrentUser() user: AuthedUser, @Param('productId') productId: string) {
    return this.cart.removeItem(user.id, productId);
  }
}
