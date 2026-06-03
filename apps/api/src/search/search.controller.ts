import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchProductsDto, SuggestionsDto } from './dto';
import { Cacheable, CacheInterceptor } from '../cache/cache.interceptor';

// Mounted under /products. The module must be registered BEFORE
// ProductsModule in AppModule so its specific routes are matched before
// `GET /products/:id` swallows them.
@ApiTags('products')
@Controller('products')
@UseInterceptors(CacheInterceptor)
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get('search')
  searchProducts(@Query() query: SearchProductsDto) {
    return this.search.search(query.q, query.page ?? 1, query.pageSize ?? 12);
  }

  @Get('suggestions')
  @Cacheable(15_000)
  suggestions(@Query() query: SuggestionsDto) {
    return this.search.suggestions(query.q, query.limit ?? 8);
  }
}
