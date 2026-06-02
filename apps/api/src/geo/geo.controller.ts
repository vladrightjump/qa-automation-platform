import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GeoService } from './geo.service';
import { ResolveGeoDto } from './dto';

// Public — no auth. Used by the storefront geolocation banner to suggest a
// locale/currency from the visitor's coordinates.
@ApiTags('geo')
@Controller('geo')
export class GeoController {
  constructor(private readonly geo: GeoService) {}

  @Get('regions')
  regions() {
    return this.geo.listRegions();
  }

  @Get('resolve')
  resolve(@Query() query: ResolveGeoDto) {
    return this.geo.resolve(query.lat, query.lng);
  }
}
