import type { Locator, Page } from '@playwright/test';
import type { PaymentMethod } from '@qa/contracts';

/**
 * Page Object for the 3-step checkout wizard.
 *
 * Selector strategy:
 *   - Buttons: `getByRole('button', { name })` — the wizard's nav buttons
 *     all have stable visible names (Next / Back / Place order / Apply / remove).
 *   - Form fields: `getByLabel(...)` for the new-address form labels and
 *     `getByPlaceholder('WELCOME10')` for the promo input which doesn't have
 *     a visible <label>.
 *   - Step indicators and the summary `<dl>`: keep `data-testid` since they
 *     have no single accessible name.
 */
export class CheckoutPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/checkout');
  }

  step(step: 'address' | 'payment' | 'review'): Locator {
    return this.page.getByTestId(`checkout-step-${step}`);
  }

  /**
   * Wait for the address step to finish loading saved addresses (or the
   * new-address form if there are none). Without this, clicking Next is
   * a no-op because no address is selected yet.
   */
  async waitForAddressReady(): Promise<void> {
    await this.page
      .locator(
        '[data-testid^="checkout-address-"], [data-testid="checkout-new-line1"]',
      )
      .first()
      .waitFor();
  }

  async next(): Promise<void> {
    await this.page.getByRole('button', { name: 'Next' }).click();
  }

  async back(): Promise<void> {
    await this.page.getByRole('button', { name: 'Back' }).click();
  }

  async pickAddress(id: string): Promise<void> {
    // Address radios live inside the address-card label container.
    await this.page.getByTestId(`checkout-address-${id}`).click();
  }

  async pickPayment(method: PaymentMethod): Promise<void> {
    // Payment radio is wrapped in a label with visible text — use getByLabel.
    const visible = method === 'COD' ? /Cash on delivery/ : new RegExp(method);
    await this.page.getByLabel(visible).check();
  }

  async fillNewAddress(address: {
    label?: string;
    name: string;
    line1: string;
    city: string;
    postalCode: string;
  }): Promise<void> {
    if (address.label)
      await this.page.getByLabel('Label').fill(address.label);
    await this.page.getByLabel('Full name').fill(address.name);
    await this.page.getByLabel('Line 1').fill(address.line1);
    await this.page.getByLabel('City').fill(address.city);
    await this.page.getByLabel('Postal code').fill(address.postalCode);
  }

  promoInput(): Locator {
    return this.page.getByPlaceholder('WELCOME10');
  }

  async applyPromo(code: string): Promise<void> {
    await this.promoInput().fill(code);
    await this.page.getByRole('button', { name: 'Apply' }).click();
  }

  async removePromo(): Promise<void> {
    await this.page.getByRole('button', { name: 'remove' }).click();
  }

  summaryTotal(): Locator {
    return this.page.getByTestId('checkout-summary-total');
  }

  summaryDiscount(): Locator {
    return this.page.getByTestId('checkout-summary-discount');
  }

  async placeOrder(): Promise<void> {
    await this.page.getByRole('button', { name: 'Place order' }).click();
  }

  orderStatus(): Locator {
    return this.page.getByTestId('order-status');
  }

  orderId(): Locator {
    return this.page.getByTestId('order-id');
  }
}
