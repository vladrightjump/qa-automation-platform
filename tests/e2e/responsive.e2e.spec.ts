// Responsive layout: the catalog grid collapses from 3 columns on desktop
// to 2 on tablet and 1 on mobile. Runs across the device-emulation projects
// so each form factor exercises its own breakpoint without faking viewports.
//
// Each device project has its own grep filter — adding `@mobile` makes the
// test run on chromium-mobile + webkit-mobile, `@tablet` opts into the iPad
// + Galaxy Tab S4 projects.
import { test, expect } from '../fixtures';

async function gridColumnCount(
  page: import('@playwright/test').Page,
  selector: string,
): Promise<number> {
  const tracks = await page.locator(selector).first().evaluate((el) => {
    return window.getComputedStyle(el).gridTemplateColumns.split(' ').length;
  });
  return tracks;
}

const CATALOG_GRID = '.grid.grid-cols-1';

test.describe('responsive — catalog grid breakpoints', () => {
  // These specs assert form-factor-specific layout, so they're meaningful
  // only on the matching device project. The desktop project runs the full
  // suite (no grep) and would otherwise see 3 columns and fail; gate it out.
  // eslint-disable-next-line no-empty-pattern
  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name === 'chromium-desktop',
      'form-factor-specific; gated to device-emulation projects',
    );
  });

  test('mobile viewport renders a single-column product grid', {
    tag: ['@mobile'],
  }, async ({ page, storefront }) => {
    await storefront.goto();
    await storefront.productCards().first().waitFor();

    const cols = await gridColumnCount(page, CATALOG_GRID);
    expect(cols).toBe(1);
  });

  test('tablet viewport renders a two-column product grid', {
    tag: ['@tablet'],
  }, async ({ page, storefront }) => {
    await storefront.goto();
    await storefront.productCards().first().waitFor();

    const cols = await gridColumnCount(page, CATALOG_GRID);
    expect(cols).toBe(2);
  });
});
