import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard, type AuthedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { OrdersService } from './orders.service';
import { ApplyPromoDto, CheckoutDto } from './dto';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller()
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post('orders')
  checkout(@CurrentUser() user: AuthedUser, @Body() dto: CheckoutDto) {
    return this.orders.checkout(user.id, dto);
  }

  @Get('orders')
  list(@CurrentUser() user: AuthedUser) {
    return this.orders.list(user.id);
  }

  @Get('orders/:id')
  get(@CurrentUser() user: AuthedUser, @Param('id') id: string) {
    return this.orders.get(user.id, id);
  }

  @Post('promo-codes/apply')
  applyPromo(@CurrentUser() user: AuthedUser, @Body() dto: ApplyPromoDto) {
    return this.orders.previewPromo(user.id, dto.code);
  }
}
