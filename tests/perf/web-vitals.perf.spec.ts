// Phase 15d — Real-user style Web Vitals capture during a scripted user
// journey on `/`. Lighthouse simulates load; this spec injects the
// `web-vitals` IIFE bundle into the page and reads the values it actually
// emits as the user scrolls/hovers — closer to what a real visitor sees,
// especially for INP which Lighthouse can't reliably measure in headless.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BUDGETS_PATH = resolve(__dirname, 'budgets.json');
const budgets = JSON.parse(readFileSync(BUDGETS_PATH, 'utf8')) as {
  routes: Record<string, { lcp: number; cls: number; tbt: number }>;
};

// Inline the IIFE bundle so we don't have to wrestle with pnpm resolution
// for an ESM-only package. The path is stable enough — web-vitals is a
// committed devDep and the dist/ filename is part of its public surface.
function findWebVitalsIife(): string {
  // Walk up from this spec to the nearest node_modules, then resolve through
  // pnpm's flat layout.
  // tests/perf/web-vitals.perf.spec.ts → tests/node_modules/web-vitals → IIFE
  const localPath = resolve(
    __dirname,
    '..',
    'node_modules',
    'web-vitals',
    'dist',
    'web-vitals.iife.js',
  );
  return readFileSync(localPath, 'utf8');
}

const WEB_VITALS_IIFE = findWebVitalsIife();

interface CollectedVital {
  name: 'LCP' | 'CLS' | 'INP' | 'TTFB' | 'FCP';
  value: number;
}

declare global {
  interface Window {
    __vitals: CollectedVital[];
    webVitals: {
      onLCP: (cb: (m: CollectedVital) => void) => void;
      onCLS: (cb: (m: CollectedVital) => void) => void;
      onINP: (cb: (m: CollectedVital) => void) => void;
      onTTFB: (cb: (m: CollectedVital) => void) => void;
      onFCP: (cb: (m: CollectedVital) => void) => void;
    };
  }
}

test(
  'web vitals on / during a scripted journey stay within budget',
  { tag: ['@perf', '@regression'] },
  async ({ page }) => {
    await page.addInitScript(() => {
      window.__vitals = [];
    });

    await page.goto('/');

    // Inject the IIFE bundle so `window.webVitals` is available, then wire
    // up subscribers. Done post-navigation so the bundle's listeners
    // attach to the live document.
    await page.addScriptTag({ content: WEB_VITALS_IIFE });
    await page.evaluate(() => {
      const push = (m: CollectedVital) => window.__vitals.push({ name: m.name, value: m.value });
      window.webVitals.onLCP(push);
      window.webVitals.onCLS(push);
      window.webVitals.onINP(push);
      window.webVitals.onTTFB(push);
      window.webVitals.onFCP(push);
    });

    // Scripted interaction so INP has something to measure.
    await page.mouse.wheel(0, 1200);
    await page.waitForTimeout(300);
    await page.mouse.wheel(0, -600);
    await page.waitForTimeout(300);

    const firstCard = page.locator('[data-testid^="product-card-"]').first();
    if (await firstCard.count()) {
      await firstCard.hover();
      await page.waitForTimeout(150);
    }

    // LCP/CLS fire on visibility change. Simulating it forces the report.
    await page.evaluate(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(500);

    const vitals = await page.evaluate(() => window.__vitals ?? []);
    expect(vitals.length, 'web-vitals should emit at least one metric').toBeGreaterThan(0);

    const budget = budgets.routes['/']!;
    const lcp = vitals.find((v) => v.name === 'LCP')?.value;
    const cls = vitals.find((v) => v.name === 'CLS')?.value ?? 0;

    if (lcp !== undefined) {
      expect(lcp, 'LCP from web-vitals on /').toBeLessThanOrEqual(budget.lcp);
    }
    expect(cls, 'CLS from web-vitals on /').toBeLessThanOrEqual(budget.cls);
  },
);
