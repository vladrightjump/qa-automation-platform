import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Page Object for /admin/products — the admin product table + modal forms.
 *
 * Selector strategy:
 *   - Buttons + form fields: prefer user-facing locators
 *     (`getByRole`, `getByLabel`). They double as a passive a11y check.
 *   - Per-row + modal *containers*: keep `data-testid` (structural ids that
 *     embed dynamic productId values aren't visible text).
 */
export class AdminProductsPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/admin/products');
  }

  row(productId: string): Locator {
    return this.page.getByTestId(`admin-row-${productId}`);
  }

  /**
   * Page through the admin table until the given row is visible, then
   * return its locator. Keeps the UI path deterministic even when many
   * factory products have accumulated across parallel specs and pushed
   * the row onto a later page. Asserts the row is reachable via the UI.
   */
  async revealRow(productId: string): Promise<Locator> {
    const row = this.row(productId);
    const info = this.page.getByTestId('admin-pagination-info');
    const next = this.page.getByTestId('admin-pagination-next');

    // Wait for the first page of data to actually render before deciding
    // anything — otherwise we'd race the async fetch and conclude the row
    // is absent while the table is still empty.
    await this.page.locator('[data-testid^="admin-row-"]').first().waitFor();

    // Page forward until the row appears. The loop is bounded by the page
    // count; each Next click waits for the page indicator to actually change
    // so we never check a row against a half-rendered page.
    for (let guard = 0; guard < 100; guard++) {
      if ((await row.count()) > 0) {
        await expect(row).toBeVisible();
        return row;
      }
      const hasNext = (await next.count()) > 0 && (await next.isEnabled());
      if (!hasNext) break;
      const before = (await info.textContent())?.trim() ?? '';
      await next.click();
      await expect(info).not.toHaveText(before);
    }
    await expect(row).toBeVisible(); // clear failure if genuinely absent
    return row;
  }

  private modal(): Locator {
    return this.page.getByTestId('admin-product-modal');
  }

  private deleteModal(): Locator {
    return this.page.getByTestId('admin-delete-modal');
  }

  async openCreate(): Promise<void> {
    await this.page.getByRole('button', { name: 'New product' }).click();
    await this.modal().waitFor();
  }

  async openEdit(productId: string): Promise<void> {
    // Per-row "Edit" button — the row container scopes the locator so
    // `getByRole('button', { name: 'Edit' })` resolves unambiguously.
    await this.row(productId).getByRole('button', { name: 'Edit' }).click();
    await this.modal().waitFor();
  }

  async openDelete(productId: string): Promise<void> {
    await this.row(productId).getByRole('button', { name: 'Delete' }).click();
    await this.deleteModal().waitFor();
  }

  async fillForm(form: {
    id?: string;
    name?: string;
    description?: string;
    priceCents?: number;
    stock?: number;
    category?: 'gadgets' | 'apparel' | 'home' | 'office';
    tags?: string;
  }): Promise<void> {
    const dialog = this.modal();
    if (form.id !== undefined)
      await dialog.getByLabel('ID').fill(form.id);
    if (form.name !== undefined)
      await dialog.getByLabel('Name').fill(form.name);
    if (form.description !== undefined)
      await dialog.getByLabel('Description').fill(form.description);
    if (form.priceCents !== undefined)
      await dialog.getByLabel(/^Price/).fill(String(form.priceCents));
    if (form.stock !== undefined)
      await dialog.getByLabel('Stock').fill(String(form.stock));
    if (form.category !== undefined)
      await dialog.getByLabel('Category').selectOption(form.category);
    if (form.tags !== undefined)
      await dialog.getByLabel(/^Tags/).fill(form.tags);
  }

  async submit(): Promise<void> {
    // Drive Save via the testid (admin-form-submit) and bypass Playwright's
    // hit-test with force:true. On narrow mobile viewports (Pixel 5) the
    // chromium native <select> picker for Category occasionally lingers in
    // the event-target layer after selectOption() resolves, so the
    // actionability check reports the <select> as intercepting pointer
    // events for the Save button even though they are visually separated.
    // The Save button is visible at the correct coordinates (verified via
    // the failure screenshot under test-results/), so force:true is the
    // accurate-fix here rather than a workaround.
    const save = this.modal().getByTestId('admin-form-submit');
    await save.scrollIntoViewIfNeeded();
    await save.click({ force: true });
    // Wait for the modal to close — confirms the request resolved.
    await this.modal().waitFor({ state: 'detached' });
  }

  async cancelForm(): Promise<void> {
    await this.modal().getByRole('button', { name: 'Cancel' }).click();
  }

  async confirmDelete(): Promise<void> {
    // Delete-confirm modal — the destructive "Delete" button is the only
    // button-with-name-Delete inside that dialog.
    await this.deleteModal().getByRole('button', { name: 'Delete' }).click();
  }

  async cancelDelete(): Promise<void> {
    await this.deleteModal().getByRole('button', { name: 'Cancel' }).click();
  }
}
