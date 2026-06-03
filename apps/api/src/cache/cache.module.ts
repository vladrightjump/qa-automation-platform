import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CacheInterceptor } from './cache.interceptor';

// Global: every module sees the same singleton CacheService so mutations
// in (e.g.) AdminProductsService can call `invalidatePrefix('/products')`
// without an explicit import.
@Global()
@Module({
  providers: [CacheService, CacheInterceptor],
  exports: [CacheService, CacheInterceptor],
})
export class CacheModule {}
