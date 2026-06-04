// Phase 15d — per-route Lighthouse perf budgets.
//
// Each route gets one test that:
//   1. navigates with a USER storage state (so authed routes work),
//   2. invokes Lighthouse via playwright-lighthouse on remote-debugging
//      port 9222 (set on launchOptions in the lighthouse-perf project),
//   3. compares LCP / CLS / TBT against the committed budget in
//      perf/budgets.json. A breach fails the run.
//
// INP is not asserted here because Lighthouse's headless run doesn't emit a
// reliable INP — that gets covered by perf/web-vitals.perf.spec.ts.
import { test, expect } from '@playwright/test';
import { playAudit } from 'playwright-lighthouse';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BUDGETS_PATH = resolve(__dirname, '..', 'budgets.json');

interface RouteBudget {
  lcp: number;
  cls: number;
  tbt: number;
}

interface BudgetsFile {
  runner: string;
  routes: Record<string, RouteBudget>;
}

const budgets = JSON.parse(readFileSync(BUDGETS_PATH, 'utf8')) as BudgetsFile;

// playwright-lighthouse's RunnerResult exposes a `lhr.audits` map; only the
// fields we need are typed here so the spec stays self-contained.
interface LhrAudit {
  numericValue?: number;
  score?: number | null;
}
interface LhrResult {
  lhr: { audits: Record<string, LhrAudit> };
}

function metric(result: LhrResult, key: string): number {
  const audit = result.lhr.audits[key];
  if (!audit || audit.numericValue === undefined) {
    throw new Error(`Lighthouse audit ${key} missing numericValue`);
  }
  return audit.numericValue;
}

for (const [route, budget] of Object.entries(budgets.routes)) {
  test(
    `lighthouse budget for ${route}`,
    { tag: ['@perf', '@regression'] },
    async ({ page }) => {
      await page.goto(route);
      const result = (await playAudit({
        page,
        port: 9222,
        thresholds: { performance: 0 }, // we own budget checks below
        disableLogs: true,
        ignoreError: true,
      })) as unknown as LhrResult;

      const lcp = metric(result, 'largest-contentful-paint');
      const cls = metric(result, 'cumulative-layout-shift');
      const tbt = metric(result, 'total-blocking-time');

      expect(lcp, `LCP for ${route}`).toBeLessThanOrEqual(budget.lcp);
      expect(cls, `CLS for ${route}`).toBeLessThanOrEqual(budget.cls);
      expect(tbt, `TBT for ${route}`).toBeLessThanOrEqual(budget.tbt);
    },
  );
}
