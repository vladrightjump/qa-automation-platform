import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard, type AuthedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, ListReviewsDto } from './dto';

@ApiTags('reviews')
@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get('products/:id/reviews')
  list(@Param('id') productId: string, @Query() query: ListReviewsDto) {
    return this.reviews.list(productId, query);
  }

  @Get('products/:id/reviews/summary')
  summary(@Param('id') productId: string) {
    return this.reviews.summary(productId);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Post('products/:id/reviews')
  create(
    @CurrentUser() user: AuthedUser,
    @Param('id') productId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviews.create(user.id, productId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Delete('reviews/:id')
  remove(@CurrentUser() user: AuthedUser, @Param('id') id: string) {
    return this.reviews.remove(user.id, id);
  }
}
