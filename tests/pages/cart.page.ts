import type { Locator, Page } from '@playwright/test';

export class CartPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/cart');
  }

  item(productId: string): Locator {
    return this.page.getByTestId(`cart-item-${productId}`);
  }

  subtotal(): Locator {
    return this.page.getByTestId('cart-subtotal');
  }

  async removeItem(productId: string): Promise<void> {
    await this.page.getByTestId(`cart-remove-${productId}`).click();
  }

  async proceedToCheckout(): Promise<void> {
    await this.page.getByTestId('cart-checkout').click();
  }
}
