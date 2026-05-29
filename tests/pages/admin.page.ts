import type { Locator, Page } from '@playwright/test';

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
    await this.modal().getByRole('button', { name: 'Save' }).click();
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
