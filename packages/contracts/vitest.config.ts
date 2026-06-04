import { defineConfig } from 'vitest/config';

// Vitest config for the pure helpers in `src/`. The package itself is
// ESM-emitting TS — Vitest reads the same source tree without a separate
// transformer step.
//
// Coverage is configured to honour Stryker's perTest analysis: it scopes
// to the four mutation-tested files so unrelated infra additions don't
// inflate the denominator.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: [
        'src/promo-math.ts',
        'src/loyalty-math.ts',
        'src/recommendations-math.ts',
        'src/i18n.ts',
      ],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 90,
        statements: 95,
      },
    },
  },
});
