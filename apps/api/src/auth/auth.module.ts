import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AdminGuard, AuthGuard } from './auth.guard';

@Module({
  providers: [AuthService, AuthGuard, AdminGuard],
  controllers: [AuthController],
  exports: [AuthGuard, AdminGuard],
})
export class AuthModule {}
