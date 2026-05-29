import type { Locator, Page } from '@playwright/test';

/**
 * Page Object for /account/addresses.
 *
 * Selector strategy mirrors AdminProductsPage: user-facing locators for
 * actions + form fields, testids only for dynamic-id structural elements.
 */
export class AddressesPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/account/addresses');
  }

  card(id: string): Locator {
    return this.page.getByTestId(`address-card-${id}`);
  }

  defaultBadge(id: string): Locator {
    return this.page.getByTestId(`address-default-${id}`);
  }

  private modal(): Locator {
    return this.page.getByTestId('address-modal');
  }

  private deleteModal(): Locator {
    return this.page.getByTestId('address-delete-modal');
  }

  async openCreate(): Promise<void> {
    await this.page.getByRole('button', { name: 'Add address' }).click();
    await this.modal().waitFor();
  }

  async openEdit(id: string): Promise<void> {
    await this.card(id).getByRole('button', { name: 'Edit' }).click();
    await this.modal().waitFor();
  }

  async openDelete(id: string): Promise<void> {
    await this.card(id).getByRole('button', { name: 'Delete' }).click();
    await this.deleteModal().waitFor();
  }

  async fillForm(form: {
    label?: string;
    name?: string;
    line1?: string;
    city?: string;
    postalCode?: string;
    isDefault?: boolean;
  }): Promise<void> {
    const dialog = this.modal();
    if (form.label !== undefined)
      await dialog.getByLabel('Label').fill(form.label);
    if (form.name !== undefined)
      await dialog.getByLabel('Full name').fill(form.name);
    if (form.line1 !== undefined)
      await dialog.getByLabel('Line 1').fill(form.line1);
    if (form.city !== undefined)
      await dialog.getByLabel('City').fill(form.city);
    if (form.postalCode !== undefined)
      await dialog.getByLabel('Postal').fill(form.postalCode);
    if (form.isDefault === true)
      await dialog.getByLabel('Set as default').check();
    if (form.isDefault === false)
      await dialog.getByLabel('Set as default').uncheck();
  }

  async submit(): Promise<void> {
    await this.modal().getByRole('button', { name: 'Save' }).click();
    await this.modal().waitFor({ state: 'detached' });
  }

  async confirmDelete(): Promise<void> {
    await this.deleteModal().getByRole('button', { name: 'Delete' }).click();
    await this.deleteModal().waitFor({ state: 'detached' });
  }
}
