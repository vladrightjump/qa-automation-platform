import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AddressesController } from './addresses.controller';
import { AddressesService } from './addresses.service';

@Module({
  imports: [AuthModule],
  providers: [AddressesService],
  controllers: [AddressesController],
})
export class AddressesModule {}
