import { defineConfig } from 'vitest/config';

// Root vitest config for Stryker. Aggregates both per-package configs so
// `pnpm mutate` runs the contracts + db unit suites against each mutant.
// Per-package `pnpm test:unit` keeps using each package's own
// vitest.config.ts (which carries coverage settings + thresholds).
export default defineConfig({
  test: {
    include: [
      'packages/contracts/src/**/*.test.ts',
      'packages/contracts/src/**/*.prop.test.ts',
      'packages/db/src/**/*.test.ts',
      'packages/db/src/**/*.prop.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: [
        'packages/contracts/src/promo-math.ts',
        'packages/contracts/src/loyalty-math.ts',
        'packages/contracts/src/recommendations-math.ts',
        'packages/contracts/src/i18n.ts',
        'packages/db/src/bulk-seed-rng.ts',
      ],
    },
  },
});
