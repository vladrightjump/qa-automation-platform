import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class SearchProductsDto {
  @ApiPropertyOptional({ description: 'Full-text query (required, ≥1 char).' })
  @IsString()
  @MinLength(1, { message: 'q must not be empty' })
  q!: string;

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
  @Max(50)
  pageSize?: number = 12;
}

export class SuggestionsDto {
  @ApiPropertyOptional({ description: 'Prefix query (required, ≥1 char).' })
  @IsString()
  @MinLength(1, { message: 'q must not be empty' })
  q!: string;

  @ApiPropertyOptional({ default: 8, description: 'Max results (1..20).' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number = 8;
}
