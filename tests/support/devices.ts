// Device-emulation matrix — the single source of truth for which form
// factors we exercise and which tag families each runs.
//
// Every entry is a Playwright built-in `devices` descriptor. No external
// device cloud, no Appium: viewport, user-agent, touch, and DPR are all
// emulated in-process so a CI run is fully reproducible.
//
// Tag conventions (Phase 13 native tags):
//   @smoke   — critical happy paths; runs on every form factor.
//   @mobile  — phone-only assertions (touch UX, single-column grid).
//   @tablet  — tablet-only assertions (two-column grid, side-by-side review).
//   @i18n / @geo — exercised on the default desktop project too; mobile/tablet
//                  pick them up via the grep when they're tagged.
import { devices } from '@playwright/test';

export interface DeviceProject {
  name: string;
  device: keyof typeof devices;
  grep: RegExp;
  formFactor: 'phone' | 'tablet';
}

export const PHONE_PROJECTS: DeviceProject[] = [
  {
    name: 'chromium-mobile',
    device: 'Pixel 5',
    grep: /@smoke|@mobile/,
    formFactor: 'phone',
  },
  {
    name: 'webkit-mobile',
    device: 'iPhone 14',
    grep: /@smoke|@mobile/,
    formFactor: 'phone',
  },
];

export const TABLET_PROJECTS: DeviceProject[] = [
  {
    name: 'tablet-ipad',
    device: 'iPad (gen 7)',
    grep: /@smoke|@tablet/,
    formFactor: 'tablet',
  },
  {
    name: 'tablet-android',
    device: 'Galaxy Tab S4',
    grep: /@smoke|@tablet/,
    formFactor: 'tablet',
  },
];
