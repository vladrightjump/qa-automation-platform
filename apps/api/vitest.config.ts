import { defineConfig } from 'vitest/config';

// Pyramid-base unit suite for the API services that have real logic
// (transactional orchestration, math, distance). Controllers, modules,
// and CRUD-shape services are deliberately excluded — their value lives
// at the integration layer (Playwright tests/api), not in mocked unit
// tests. Coverage is scoped to the three service files so unrelated
// additions don't inflate the denominator.
export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: [
        'src/orders/orders.service.ts',
        'src/orders/promo.service.ts',
        'src/geo/geo.service.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
