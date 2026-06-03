import { Controller, Get, Headers, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard, type AuthedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RecommendationsService } from './recommendations.service';

@ApiTags('recommendations')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recs: RecommendationsService) {}

  // Not @Cacheable: the response depends on the authenticated user and on
  // the X-Recently-Viewed header, so per-route caching would collide
  // across users. The catalog table reads inside the service still hit
  // Postgres's own page cache.
  @Get()
  getRecommendations(
    @CurrentUser() user: AuthedUser,
    @Headers('x-recently-viewed') recentlyViewed?: string,
  ) {
    return this.recs.getForUser(user.id, recentlyViewed);
  }
}
