import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Pyramid-base unit suite for the three client-side providers/components
// that have real logic — AuthProvider's hydration + storage round-trip,
// LocaleProvider's resolution chain + message lookup, GeoBanner's state
// machine over geolocation/dismiss. Page-shape components are
// deliberately excluded; their value lives at the Playwright E2E layer.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./vitest.setup.ts'],
    include: ['lib/**/*.test.tsx', 'lib/**/*.test.ts', 'components/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: [
        'lib/auth.tsx',
        'lib/i18n.tsx',
        'components/GeoBanner.tsx',
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
