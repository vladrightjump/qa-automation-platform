import { Injectable } from '@nestjs/common';

interface Entry {
  body: unknown;
  expiresAt: number;
}

/**
 * Tiny in-process TTL cache for GET responses. One entry per request URL
 * (path + querystring). Not LRU-bounded — the route surface that opts in
 * is small and the TTL is short, so unbounded growth isn't a concern for a
 * test-fixture SUT. If that ever changes, swap in cache-manager's LRU
 * store; the CacheInterceptor contract (the X-Cache header) stays the same.
 *
 * Mutations call `invalidatePrefix('/products')` to bust list + autocomplete
 * caches when the underlying data changes. Tests assert on the resulting
 * X-Cache: miss after the next read.
 */
@Injectable()
export class CacheService {
  private readonly store = new Map<string, Entry>();

  get(key: string): unknown | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.body;
  }

  set(key: string, body: unknown, ttlMs: number): void {
    this.store.set(key, { body, expiresAt: Date.now() + ttlMs });
  }

  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  clear(): void {
    this.store.clear();
  }
}
