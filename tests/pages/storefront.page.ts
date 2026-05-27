import type { Locator, Page } from '@playwright/test';

/**
 * Page Object for the product list / storefront home. Exposes intent
 * (`addToCart(id)`) rather than mechanics (`click('#btn')`).
 */
export class StorefrontPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  productCard(productId: string): Locator {
    return this.page.getByTestId(`product-card-${productId}`);
  }

  async addToCart(productId: string): Promise<void> {
    await this.page.getByTestId(`add-to-cart-${productId}`).click();
  }

  cartCount(): Locator {
    return this.page.getByTestId('cart-count');
  }
}
