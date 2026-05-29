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
   *
   * Uses `getByRole('button', { name: 'Remove' })` scoped to the row so
   * the dynamic productId only appears in the row container locator.
   */
  async removeItem(
    productId: string,
    options: { confirm?: boolean } = {},
  ): Promise<void> {
    await this.item(productId)
      .getByRole('button', { name: 'Remove' })
      .click();
    const modal = this.page.getByTestId('cart-remove-modal');
    if (options.confirm === false) {
      await modal.getByRole('button', { name: 'Cancel' }).click();
    } else {
      await modal.getByRole('button', { name: 'Remove' }).click();
    }
  }

  async proceedToCheckout(): Promise<void> {
    await this.page.getByTestId('cart-checkout').click();
  }
}
