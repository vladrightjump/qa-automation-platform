import { defineConfig, devices, type ReporterDescription } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PHONE_PROJECTS, TABLET_PROJECTS } from './support/devices';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Single source of truth for env: the repo-root .env. Falls back to defaults
// if it isn't present (e.g. on a clean CI checkout that hasn't `cp`d the
// example yet — CI sets the same vars explicitly).
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
  testMatch: ['**/*.spec.ts', 'setup/**/*.setup.ts'],
  // Agent-authored drafts under `e2e/_generated/` are excluded from every
  // run — see e2e/_generated/README.md.
  testIgnore: ['**/_generated/**', '**/*.draft.spec.ts'],
  timeout: 30_000,
  expect: {
    timeout: 5_000,
    // Visual regression: tolerate sub-pixel anti-aliasing without flakes.
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' },
  },
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
    // 1. Setup project — runs once, produces storageState files for the
    //    "shared demo user" + admin. Downstream projects depend on it.
    {
      name: 'setup',
      testMatch: /setup\/.*\.setup\.ts/,
    },

    // 2. Default desktop chromium — full suite. Per-test fixtures keep
    //    using their own auth path; specs that opt into the shared
    //    storageState set `test.use({ storageState })` locally.
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
      testIgnore: ['**/*.visual.spec.ts'],
    },

    // 3. Phone form factors — both engines, @smoke + @mobile tags only.
    //    Matrix lives in tests/support/devices.ts so the config stays terse.
    ...PHONE_PROJECTS.map((p) => ({
      name: p.name,
      use: { ...devices[p.device] },
      dependencies: ['setup'],
      grep: p.grep,
      testIgnore: ['**/*.visual.spec.ts'],
    })),

    // 4. Tablet form factors — iPad (webkit) + Galaxy Tab S4 (chromium).
    //    @smoke + @tablet tags; responsive layout assertions land here.
    ...TABLET_PROJECTS.map((p) => ({
      name: p.name,
      use: { ...devices[p.device] },
      dependencies: ['setup'],
      grep: p.grep,
      testIgnore: ['**/*.visual.spec.ts'],
    })),

    // 5. Cross-browser smoke — webkit @smoke only, keeps CI minutes sane.
    //    Also uses the per-test fixture auth path.
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup'],
      grep: /@smoke/,
      testIgnore: ['**/*.visual.spec.ts'],
    },

    // 6. Visual regression — separate project so screenshots don't run
    //    in every shard. *Uses* storageState so visual specs land on a
    //    deterministic logged-in page without spinning up a per-test user.
    //    Trace + screenshot are forced on for diff debugging. Excludes
    //    `tablet.visual.spec.ts` — that's owned by the tablet-visual project.
    {
      name: 'visual',
      testMatch: /.*\.visual\.spec\.ts/,
      testIgnore: ['**/tablet.visual.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: USER_STATE,
        trace: 'on',
        screenshot: 'on',
      },
      dependencies: ['setup'],
    },

    // 7. Tablet visual baselines — iPad descriptor for screenshot diffs
    //    on the localized storefront at tablet width.
    {
      name: 'tablet-visual',
      testMatch: /.*tablet\.visual\.spec\.ts/,
      use: {
        ...devices['iPad (gen 7)'],
        storageState: USER_STATE,
        trace: 'on',
        screenshot: 'on',
      },
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

  // Provide a placeholder export of the auth file paths so other modules
  // can import without duplicating the constant.
});

export const STORAGE_STATE_PATHS = {
  user: USER_STATE,
  admin: ADMIN_STATE,
} as const;
