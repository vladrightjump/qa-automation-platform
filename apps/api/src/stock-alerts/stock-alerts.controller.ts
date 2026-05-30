import {
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
import { StockAlertsService } from './stock-alerts.service';

@ApiTags('stock-alerts')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller()
export class StockAlertsController {
  constructor(private readonly alerts: StockAlertsService) {}

  @Post('products/:id/stock-alert')
  subscribe(@CurrentUser() user: AuthedUser, @Param('id') id: string) {
    return this.alerts.subscribe(user.id, id);
  }

  @Delete('products/:id/stock-alert')
  unsubscribe(@CurrentUser() user: AuthedUser, @Param('id') id: string) {
    return this.alerts.unsubscribe(user.id, id);
  }

  @Get('stock-alerts')
  list(@CurrentUser() user: AuthedUser) {
    return this.alerts.list(user.id);
  }
}
