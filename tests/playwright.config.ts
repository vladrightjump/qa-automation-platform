import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Single source of truth for env: the repo-root .env. Falls back to defaults
// if it isn't present (e.g. on a clean CI checkout that hasn't `cp`d the
// example yet — CI sets the same vars explicitly).
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:3001';
const WEB_BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: '.',
  testMatch: ['**/*.spec.ts'],
  // Phase 7: agent-authored drafts live under `e2e/_generated/` and are
  // excluded from every run. Drafts also use `*.draft.spec.ts` and
  // `test.describe.skip` for defence-in-depth — see e2e/_generated/README.md.
  testIgnore: ['**/_generated/**', '**/*.draft.spec.ts'],
  // Tags drive selective runs: `pnpm test:smoke` → @smoke, full suite on main.
  // Wire greps via CLI rather than config so individual specs stay portable.
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? '50%' : undefined,
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['list'],
  ],
  use: {
    baseURL: WEB_BASE,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  // Boot API + web automatically. When something is already listening
  // (local dev), reuse it; CI always spawns fresh.
  webServer: [
    {
      command: 'pnpm --filter @qa/api start',
      url: `${API_BASE}/products`,
      cwd: path.resolve(__dirname, '..'),
      reuseExistingServer: !isCI,
      stdout: 'ignore',
      stderr: 'pipe',
      timeout: 90_000,
    },
    {
      command: 'pnpm --filter @qa/web start',
      url: WEB_BASE,
      cwd: path.resolve(__dirname, '..'),
      reuseExistingServer: !isCI,
      stdout: 'ignore',
      stderr: 'pipe',
      timeout: 90_000,
    },
  ],
});
