import {
  BadRequestException,
  Controller,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrderStatus } from '@qa/db';
import { AdminGuard } from '../auth/auth.guard';
import { AdminOrdersService } from './admin-orders.service';

const ORDER_STATUSES = Object.values(OrderStatus) as string[];

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin')
export class AdminOrdersController {
  constructor(private readonly orders: AdminOrdersService) {}

  @Get('orders')
  list(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    if (status !== undefined && !ORDER_STATUSES.includes(status)) {
      throw new BadRequestException(`Invalid status ${status}`);
    }
    return this.orders.list(
      status as OrderStatus | undefined,
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 20,
    );
  }

  @Post('orders/:id/fulfill')
  @HttpCode(200)
  fulfill(@Param('id') id: string) {
    return this.orders.fulfill(id);
  }

  @Post('returns/:id/approve')
  approveReturn(@Param('id') id: string) {
    return this.orders.approveReturn(id);
  }

  @Post('returns/:id/reject')
  rejectReturn(@Param('id') id: string) {
    return this.orders.rejectReturn(id);
  }

  @Post('returns/:id/refund')
  refundReturn(@Param('id') id: string) {
    return this.orders.refundReturn(id);
  }
}
