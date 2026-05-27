import { Module } from '@nestjs/common';
import { TestController } from './test.controller';
import { TestEndpointsGuard } from './test-endpoints.guard';

@Module({
  providers: [TestEndpointsGuard],
  controllers: [TestController],
})
export class TestModule {}
