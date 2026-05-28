import type { Locator, Page } from '@playwright/test';
import type { PaymentMethod } from '@qa/contracts';

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
    await this.page.getByTestId('checkout-next').click();
  }

  async back(): Promise<void> {
    await this.page.getByTestId('checkout-back').click();
  }

  async pickAddress(id: string): Promise<void> {
    await this.page.getByTestId(`checkout-address-${id}`).click();
  }

  async pickPayment(method: PaymentMethod): Promise<void> {
    await this.page.getByTestId(`checkout-payment-${method}`).click();
  }

  async fillNewAddress(address: {
    label?: string;
    name: string;
    line1: string;
    city: string;
    postalCode: string;
  }): Promise<void> {
    if (address.label)
      await this.page.getByTestId('checkout-new-label').fill(address.label);
    await this.page.getByTestId('checkout-new-name').fill(address.name);
    await this.page.getByTestId('checkout-new-line1').fill(address.line1);
    await this.page.getByTestId('checkout-new-city').fill(address.city);
    await this.page.getByTestId('checkout-new-postal').fill(address.postalCode);
  }

  promoInput(): Locator {
    return this.page.getByTestId('checkout-promo-input');
  }

  async applyPromo(code: string): Promise<void> {
    await this.promoInput().fill(code);
    await this.page.getByTestId('checkout-promo-apply').click();
  }

  async removePromo(): Promise<void> {
    await this.page.getByTestId('checkout-promo-remove').click();
  }

  summaryTotal(): Locator {
    return this.page.getByTestId('checkout-summary-total');
  }

  summaryDiscount(): Locator {
    return this.page.getByTestId('checkout-summary-discount');
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
