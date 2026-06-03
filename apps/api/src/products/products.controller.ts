import { Controller, Get, Param, Query, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { ListProductsDto } from './dto';
import { Cacheable } from '../cache/cache.interceptor';
import { CacheInterceptor } from '../cache/cache.interceptor';

@ApiTags('products')
@Controller('products')
@UseInterceptors(CacheInterceptor)
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @Cacheable(30_000)
  list(@Query() query: ListProductsDto) {
    return this.products.list(query);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.products.get(id);
  }
}
