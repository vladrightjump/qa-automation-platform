// Phase 15d — runs once before the lighthouse-perf project to push the
// catalog past the default seeded baseline. Idempotent: re-runs with the
// same RNG seed are no-ops at the DB level (skipDuplicates on conflict).
import { test as setup } from '@playwright/test';
import seedPerf from '../runner/seed';

setup('bulk-seed perf catalog', async () => {
  await seedPerf();
});
