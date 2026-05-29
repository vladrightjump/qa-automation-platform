// Custom `expect.extend` matchers. Three on offer:
//
//   - `toHaveCartCount(n)` — reads the navbar cart-count badge, auto-retries.
//   - `toMatchContract(schema)` — Zod-parses a value, surfaces a path-aware
//     error message when the contract drifts.
//   - `toBeAccessible(opts?)` — runs axe-core against the page and asserts
//     no violations at-or-above the configured impact threshold.
//
// All matchers honour the global `expect.timeout` for retrying-conditions
// where appropriate, mirroring Playwright's web-first assertion model.
import { expect as base, type Page, type Locator } from '@playwright/test';
// zod is a transitive workspace dep via @qa/contracts; use its re-export
// to avoid adding zod directly to tests/package.json.
import { z } from '@qa/contracts';
import AxeBuilder from '@axe-core/playwright';

type ZodSchema = z.ZodTypeAny;

interface MatcherResult {
  pass: boolean;
  message: () => string;
  name?: string;
  expected?: unknown;
  actual?: unknown;
}

type Impact = 'minor' | 'moderate' | 'serious' | 'critical';

const IMPACT_RANK: Record<Impact, number> = {
  minor: 0,
  moderate: 1,
  serious: 2,
  critical: 3,
};

export const expect = base.extend({
  /**
   * Asserts the navbar cart-count badge reads `n`. Auto-retries using
   * Playwright's expect.poll under the hood so it composes with web-first
   * timing without callers having to wait manually.
   */
  async toHaveCartCount(
    page: Page,
    expected: number,
    options: { timeout?: number } = {},
  ): Promise<MatcherResult> {
    const timeout = options.timeout ?? 5_000;
    const locator: Locator = page.getByTestId('cart-count');
    let actual = '<not found>';
    try {
      await base
        .poll(
          async () => {
            actual = (await locator.textContent()) ?? '';
            return actual.trim();
          },
          { timeout },
        )
        .toBe(String(expected));
      return {
        pass: true,
        message: () => `cart-count badge reads "${expected}"`,
      };
    } catch {
      return {
        pass: false,
        name: 'toHaveCartCount',
        expected,
        actual,
        message: () =>
          `Expected cart-count badge to read "${expected}" within ${timeout}ms.\nReceived: "${actual.trim()}"`,
      };
    }
  },

  /**
   * Parses a value through a Zod schema. On failure, surfaces the path +
   * issue for every violation — far more useful than a generic
   * `expect(data).toEqual(...)` diff when API surface drifts.
   */
  toMatchContract(received: unknown, schema: ZodSchema): MatcherResult {
    const result = schema.safeParse(received);
    if (result.success) {
      return {
        pass: true,
        message: () => 'value matches contract',
      };
    }
    const issues = result.error.issues
      .map(
        (i: z.ZodIssue) =>
          `  • ${i.path.join('.') || '<root>'}: ${i.message}`,
      )
      .join('\n');
    return {
      pass: false,
      name: 'toMatchContract',
      message: () => `Contract violation(s):\n${issues}`,
    };
  },

  /**
   * Runs axe-core against the page. Fails when any violation at-or-above
   * `minImpact` is detected. Optional `disableRules` lists rule ids to
   * skip (use sparingly, comment why).
   */
  async toBeAccessible(
    page: Page,
    options: { minImpact?: Impact; disableRules?: string[] } = {},
  ): Promise<MatcherResult> {
    const minImpact = options.minImpact ?? 'serious';
    const minRank = IMPACT_RANK[minImpact];

    let builder = new AxeBuilder({ page });
    if (options.disableRules?.length) {
      builder = builder.disableRules(options.disableRules);
    }
    const result = await builder.analyze();

    const blocking = result.violations.filter((v) => {
      const impact = (v.impact as Impact | null) ?? 'minor';
      return IMPACT_RANK[impact] >= minRank;
    });

    if (blocking.length === 0) {
      return {
        pass: true,
        message: () =>
          `no a11y violations at impact >= ${minImpact} (${result.violations.length} below-threshold violations skipped)`,
      };
    }

    const summary = blocking
      .map(
        (v) =>
          `  • [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node${v.nodes.length === 1 ? '' : 's'})\n    ${v.helpUrl}`,
      )
      .join('\n');
    return {
      pass: false,
      name: 'toBeAccessible',
      message: () =>
        `Expected no a11y violations >= ${minImpact}, found ${blocking.length}:\n${summary}`,
    };
  },
});

// Re-export the Playwright `test` directly so call-sites can do:
//   import { test, expect } from '../fixtures';
// and still get our extended `expect`.
export { test } from '@playwright/test';
