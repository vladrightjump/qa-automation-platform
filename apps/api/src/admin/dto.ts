import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const CATEGORIES = ['gadgets', 'apparel', 'home', 'office'] as const;
export type ProductCategory = (typeof CATEGORIES)[number];

export class CreateProductDto {
  @ApiProperty({ description: 'Deterministic id, e.g. prod_widget' })
  @IsString()
  @Matches(/^prod_[a-z0-9_]+$/, {
    message: 'id must match /^prod_[a-z0-9_]+$/',
  })
  id!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  priceCents!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  stock!: number;

  @ApiProperty({ enum: CATEGORIES })
  @IsEnum(CATEGORIES)
  category!: ProductCategory;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  priceCents?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ enum: CATEGORIES })
  @IsOptional()
  @IsEnum(CATEGORIES)
  category?: ProductCategory;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
