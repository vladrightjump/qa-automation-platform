import type { Locator, Page } from '@playwright/test';
import type { PaymentMethod } from '@qa/contracts';

/**
 * Page Object for the single-page checkout (address + payment + place).
 * Address management lives inline — the "Manage addresses" route was
 * removed in the portfolio trim.
 */
export class CheckoutPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/checkout');
  }

  /**
   * Wait for the saved-address radios (or the new-address form) to
   * render so the Submit click doesn't race the /addresses fetch.
   */
  async waitForAddressReady(): Promise<void> {
    await this.page
      .locator(
        '[data-testid^="checkout-address-"], [data-testid="checkout-new-line1"]',
      )
      .first()
      .waitFor();
  }

  async pickAddress(id: string): Promise<void> {
    await this.page.getByTestId(`checkout-address-${id}`).click();
  }

  async pickPayment(method: PaymentMethod): Promise<void> {
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
    if (address.label) await this.page.getByTestId('checkout-new-label').fill(address.label);
    await this.page.getByTestId('checkout-new-name').fill(address.name);
    await this.page.getByTestId('checkout-new-line1').fill(address.line1);
    await this.page.getByTestId('checkout-new-city').fill(address.city);
    await this.page.getByTestId('checkout-new-postal').fill(address.postalCode);
  }

  summaryTotal(): Locator {
    return this.page.getByTestId('checkout-summary-total');
  }

  async placeOrder(): Promise<void> {
    await this.page.getByTestId('checkout-submit').click();
  }

  orderStatus(): Locator {
    return this.page.getByTestId('order-status');
  }

  orderId(): Locator {
    return this.page.getByTestId('order-id');
  }
}
