import { defineConfig } from 'vitest/config';

// Vitest config for the pure helpers inside `src/seed-helpers.ts`. The DB
// package's runtime helpers (the Prisma client + the actual seeders) need
// a live database — those live in `tests/api/*.db.spec.ts`. Vitest covers
// only the pure RNG + bias logic + ID construction here.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: ['src/bulk-seed-rng.ts'],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 90,
        statements: 95,
      },
    },
  },
});
