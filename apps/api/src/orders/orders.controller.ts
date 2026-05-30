import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard, type AuthedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { OrdersService } from './orders.service';
import { ApplyPromoDto, CheckoutDto, RequestReturnDto } from './dto';

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

  @Post('orders/:id/cancel')
  cancel(@CurrentUser() user: AuthedUser, @Param('id') id: string) {
    return this.orders.cancel(user.id, id);
  }

  @Post('orders/:id/return')
  requestReturn(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
    @Body() dto: RequestReturnDto,
  ) {
    return this.orders.requestReturn(user.id, id, dto.reason);
  }

  @Get('loyalty')
  loyalty(@CurrentUser() user: AuthedUser) {
    return this.orders.getLoyalty(user.id);
  }
}

// Public promo discovery — no auth so the storefront can show available
// deals to signed-out visitors. Kept separate from the guarded controller
// above so the class-level AuthGuard does not apply.
@ApiTags('promo-codes')
@Controller('promo-codes')
export class PromoController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list() {
    return this.orders.listPromoCodes();
  }
}
