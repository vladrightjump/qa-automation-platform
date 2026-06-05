import { defineConfig } from 'vitest/config';

// Root vitest config for Stryker. Aggregates the per-package configs so
// `pnpm mutate` runs the contracts + db + api-service unit suites
// against each mutant. apps/web is excluded — it needs jsdom +
// React-JSX-runtime plugin + the jest-dom setup file, none of which
// the root verifier needs (web stays a per-package suite).
// Per-package `pnpm test:unit` keeps using each package's own
// vitest.config.ts (which carries coverage settings + thresholds).
export default defineConfig({
  test: {
    include: [
      'packages/contracts/src/**/*.test.ts',
      'packages/contracts/src/**/*.prop.test.ts',
      'packages/db/src/**/*.test.ts',
      'packages/db/src/**/*.prop.test.ts',
      'apps/api/src/**/*.test.ts',
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
        'apps/api/src/orders/orders.service.ts',
        'apps/api/src/orders/promo.service.ts',
        'apps/api/src/geo/geo.service.ts',
      ],
    },
  },
});
