import type { Locator, Page } from '@playwright/test';

export class CheckoutPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/checkout');
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
