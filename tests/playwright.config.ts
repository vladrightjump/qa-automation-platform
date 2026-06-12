import { defineConfig, devices, type ReporterDescription } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Single source of truth for env: the repo-root .env. Falls back to defaults
// if it isn't present.
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:3001';
const WEB_BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const isCI = !!process.env.CI;

const USER_STATE = path.resolve(__dirname, '.auth/user.json');
const ADMIN_STATE = path.resolve(__dirname, '.auth/admin.json');

const reporter: ReporterDescription[] = [
  ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ['list'],
  ['junit', { outputFile: 'test-results/junit.xml' }],
];
if (isCI) reporter.push(['github']);

export default defineConfig({
  testDir: '.',
  testMatch: [
    '**/*.spec.ts',
    'setup/**/*.setup.ts',
  ],
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? '50%' : undefined,
  reporter,
  use: {
    baseURL: WEB_BASE,
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    // 1. Setup — runs once, produces storageState files for the shared
    //    demo user + admin. The chromium-desktop project depends on it.
    {
      name: 'setup',
      testMatch: /setup\/.*\.setup\.ts/,
    },

    // 2. Default desktop chromium — full suite. Per-test fixtures use
    //    their own auth path; specs that opt into the shared storageState
    //    set `test.use({ storageState })` locally.
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],

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

export const STORAGE_STATE_PATHS = {
  user: USER_STATE,
  admin: ADMIN_STATE,
} as const;
