import type { Locator, Page } from '@playwright/test';

/**
 * Page Object for /admin/products — the admin product table + modal forms.
 * Surfaces intent over selectors; consumers compose flows like
 * `await admin.create({ id, name, ... })` rather than clicking the form.
 */
export class AdminProductsPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/admin/products');
  }

  row(productId: string): Locator {
    return this.page.getByTestId(`admin-row-${productId}`);
  }

  async openCreate(): Promise<void> {
    await this.page.getByTestId('admin-new-product').click();
    await this.page.getByTestId('admin-product-modal').waitFor();
  }

  async openEdit(productId: string): Promise<void> {
    await this.page.getByTestId(`admin-edit-${productId}`).click();
    await this.page.getByTestId('admin-product-modal').waitFor();
  }

  async openDelete(productId: string): Promise<void> {
    await this.page.getByTestId(`admin-delete-${productId}`).click();
    await this.page.getByTestId('admin-delete-modal').waitFor();
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
    if (form.id !== undefined)
      await this.page.getByTestId('admin-form-id').fill(form.id);
    if (form.name !== undefined)
      await this.page.getByTestId('admin-form-name').fill(form.name);
    if (form.description !== undefined)
      await this.page
        .getByTestId('admin-form-description')
        .fill(form.description);
    if (form.priceCents !== undefined)
      await this.page
        .getByTestId('admin-form-price')
        .fill(String(form.priceCents));
    if (form.stock !== undefined)
      await this.page.getByTestId('admin-form-stock').fill(String(form.stock));
    if (form.category !== undefined)
      await this.page.getByTestId('admin-form-category').selectOption(form.category);
    if (form.tags !== undefined)
      await this.page.getByTestId('admin-form-tags').fill(form.tags);
  }

  async submit(): Promise<void> {
    await this.page.getByTestId('admin-form-submit').click();
    // Wait for the modal to close — confirms the request resolved.
    await this.page
      .getByTestId('admin-product-modal')
      .waitFor({ state: 'detached' });
  }

  async cancelForm(): Promise<void> {
    await this.page.getByTestId('admin-form-cancel').click();
  }

  async confirmDelete(): Promise<void> {
    await this.page.getByTestId('admin-delete-confirm').click();
  }

  async cancelDelete(): Promise<void> {
    await this.page.getByTestId('admin-delete-cancel').click();
  }
}
