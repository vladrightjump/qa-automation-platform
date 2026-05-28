import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export type ProductSort =
  | 'name_asc'
  | 'name_desc'
  | 'price_asc'
  | 'price_desc'
  | 'newest';

const PRODUCT_SORTS: ProductSort[] = [
  'name_asc',
  'name_desc',
  'price_asc',
  'price_desc',
  'newest',
];

export type ProductCategory = 'gadgets' | 'apparel' | 'home' | 'office';

const CATEGORIES: ProductCategory[] = ['gadgets', 'apparel', 'home', 'office'];

export class ListProductsDto {
  @ApiPropertyOptional({ description: 'Free-text search across name + description.' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: CATEGORIES, isArray: true })
  @IsOptional()
  @Transform(({ value }) =>
    Array.isArray(value) ? value : String(value).split(',').filter(Boolean),
  )
  @IsArray()
  @IsEnum(CATEGORIES, { each: true })
  category?: ProductCategory[];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPriceCents?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPriceCents?: number;

  @ApiPropertyOptional({ enum: PRODUCT_SORTS })
  @IsOptional()
  @IsEnum(PRODUCT_SORTS)
  sort?: ProductSort = 'name_asc';

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 12;
}
