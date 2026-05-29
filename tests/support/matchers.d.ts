// Type augmentation for the custom matchers registered in matchers.ts.
// Without this, `expect(page).toHaveCartCount(n)` would not type-check.
import type { z } from '@qa/contracts';

type ZodSchema = z.ZodTypeAny;

type Impact = 'minor' | 'moderate' | 'serious' | 'critical';

declare module '@playwright/test' {
  // `T` is required by Playwright's Matchers signature even though our
  // matchers don't all reference it directly.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Matchers<R, T = unknown> {
    /** Reads the navbar cart-count badge. Auto-retries up to `timeout` ms. */
    toHaveCartCount(expected: number, options?: { timeout?: number }): Promise<R>;

    /** Parses `T` through a Zod schema; failure surfaces a path-aware diff. */
    toMatchContract(schema: ZodSchema): R;

    /** Runs axe-core on the page; fails on any violation >= minImpact. */
    toBeAccessible(options?: {
      minImpact?: Impact;
      disableRules?: string[];
    }): Promise<R>;
  }
}
