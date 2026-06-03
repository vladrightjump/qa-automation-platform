import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, of, tap } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { CacheService } from './cache.service';

// Per-route opt-in. Decorate a handler with @Cacheable(ttlMs) to wire it
// through this interceptor; nothing is cached implicitly.
export const CACHE_TTL_METADATA = 'qa:cache:ttl-ms';
export const Cacheable = (ttlMs = 30_000) => SetMetadata(CACHE_TTL_METADATA, ttlMs);

/**
 * Cache observability contract (phase 15a, locked):
 *   X-Cache: hit    — served from cache
 *   X-Cache: miss   — passed through and stored
 *   X-Cache: bypass — request had `Cache-Control: no-cache`
 *
 * Tests assert on the header, not on latency, so cache behaviour is
 * deterministic and reviewable.
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private readonly cache: CacheService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ttlMs = this.reflector.getAllAndOverride<number | undefined>(
      CACHE_TTL_METADATA,
      [context.getHandler(), context.getClass()],
    );
    if (!ttlMs) return next.handle();

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    if (req.method !== 'GET') return next.handle();

    const bypass = (req.headers['cache-control'] ?? '').toString().includes('no-cache');
    if (bypass) {
      res.setHeader('X-Cache', 'bypass');
      return next.handle();
    }

    const key = `${req.originalUrl ?? req.url}`;
    const cached = this.cache.get(key);
    if (cached !== null) {
      res.setHeader('X-Cache', 'hit');
      return of(cached);
    }

    res.setHeader('X-Cache', 'miss');
    return next.handle().pipe(
      tap((body: unknown) => {
        this.cache.set(key, body, ttlMs);
      }),
    );
  }
}
