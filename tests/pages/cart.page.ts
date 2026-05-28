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

  /**
   * Click Remove and confirm the deletion. The button now opens a modal —
   * pass `confirm: false` to test the cancel path instead.
   */
  async removeItem(
    productId: string,
    options: { confirm?: boolean } = {},
  ): Promise<void> {
    await this.page.getByTestId(`cart-remove-${productId}`).click();
    if (options.confirm === false) {
      await this.page.getByTestId('cart-remove-cancel').click();
    } else {
      await this.page.getByTestId('cart-remove-confirm').click();
    }
  }

  async proceedToCheckout(): Promise<void> {
    await this.page.getByTestId('cart-checkout').click();
  }
}
