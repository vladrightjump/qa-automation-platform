import type { Locator, Page } from '@playwright/test';

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

  async openCreate(): Promise<void> {
    await this.page.getByTestId('addresses-new').click();
    await this.page.getByTestId('address-modal').waitFor();
  }

  async openEdit(id: string): Promise<void> {
    await this.page.getByTestId(`address-edit-${id}`).click();
    await this.page.getByTestId('address-modal').waitFor();
  }

  async openDelete(id: string): Promise<void> {
    await this.page.getByTestId(`address-delete-${id}`).click();
    await this.page.getByTestId('address-delete-modal').waitFor();
  }

  async fillForm(form: {
    label?: string;
    name?: string;
    line1?: string;
    city?: string;
    postalCode?: string;
    isDefault?: boolean;
  }): Promise<void> {
    if (form.label !== undefined)
      await this.page.getByTestId('address-form-label').fill(form.label);
    if (form.name !== undefined)
      await this.page.getByTestId('address-form-name').fill(form.name);
    if (form.line1 !== undefined)
      await this.page.getByTestId('address-form-line1').fill(form.line1);
    if (form.city !== undefined)
      await this.page.getByTestId('address-form-city').fill(form.city);
    if (form.postalCode !== undefined)
      await this.page.getByTestId('address-form-postal').fill(form.postalCode);
    if (form.isDefault === true)
      await this.page.getByTestId('address-form-default').check();
    if (form.isDefault === false)
      await this.page.getByTestId('address-form-default').uncheck();
  }

  async submit(): Promise<void> {
    await this.page.getByTestId('address-form-submit').click();
    await this.page
      .getByTestId('address-modal')
      .waitFor({ state: 'detached' });
  }

  async confirmDelete(): Promise<void> {
    await this.page.getByTestId('address-delete-confirm').click();
    await this.page
      .getByTestId('address-delete-modal')
      .waitFor({ state: 'detached' });
  }
}
