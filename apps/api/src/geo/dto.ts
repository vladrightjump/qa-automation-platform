import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';

// Query params arrive as strings; @Type coerces to number before the
// lat/lng range validators run. Out-of-range → 400 (handled by the global
// ValidationPipe).
export class ResolveGeoDto {
  @ApiProperty({ description: 'Latitude, -90..90', example: 52.52 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({ description: 'Longitude, -180..180', example: 13.405 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;
}
