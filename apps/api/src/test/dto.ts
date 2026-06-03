import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class BulkSeedProductsDto {
  @ApiProperty({ description: 'Number of synthetic products to seed (1..5000).' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5000)
  count!: number;

  @ApiPropertyOptional({ default: 42, description: 'RNG seed for deterministic data.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  rngSeed?: number = 42;
}
