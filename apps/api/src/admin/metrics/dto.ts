import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

// ISO-8601 date or datetime accepted. Defaults applied in the service:
// `from` = 30 days ago, `to` = now.
export class SalesMetricsQueryDto {
  @ApiPropertyOptional({ description: 'ISO-8601 timestamp (inclusive).' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'ISO-8601 timestamp (inclusive).' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
