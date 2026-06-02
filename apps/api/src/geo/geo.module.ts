import { Module } from '@nestjs/common';
import { GeoController } from './geo.controller';
import { GeoService } from './geo.service';

@Module({
  providers: [GeoService],
  controllers: [GeoController],
})
export class GeoModule {}
