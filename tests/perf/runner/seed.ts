// Phase 15d — bulk-seed hook for the perf project.
//
// Called from Playwright `globalSetup` on the `lighthouse-perf` project so
// every perf run measures the SUT at a realistic catalog size. Idempotent:
// the same (count, rngSeed) pair always produces the same product IDs, so
// repeated runs are no-ops after the first.
import { request } from '@playwright/test';

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:3001';
const COUNT = Number(process.env.PERF_BULK_SEED_COUNT ?? 1000);
const SEED = Number(process.env.PERF_BULK_SEED_RNG ?? 42);

export default async function seedPerf(): Promise<void> {
  const ctx = await request.newContext({ baseURL: API_BASE });
  const res = await ctx.post('/test/bulk-seed-products', {
    data: { count: COUNT, rngSeed: SEED },
  });
  if (!res.ok()) {
    const body = await res.text();
    throw new Error(
      `perf bulk-seed failed: ${res.status()} ${body}\n` +
        'Hint: ENABLE_TEST_ENDPOINTS=true must be set on the API.',
    );
  }
  await ctx.dispose();
}
