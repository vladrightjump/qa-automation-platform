import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { ListProductsDto } from './dto';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list(@Query() query: ListProductsDto) {
    return this.products.list(query);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.products.get(id);
  }
}
