import type { Locator, Page } from '@playwright/test';
import type { ProductCategory, ProductSort } from '@qa/contracts';

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

  // ---------- catalog filters / search / sort / pagination ----------

  searchInput(): Locator {
    return this.page.getByTestId('catalog-search');
  }

  async search(query: string): Promise<void> {
    const input = this.searchInput();
    await input.fill(query);
  }

  categoryCheckbox(category: ProductCategory): Locator {
    return this.page.getByTestId(`catalog-category-${category}`);
  }

  async toggleCategory(category: ProductCategory): Promise<void> {
    await this.categoryCheckbox(category).click();
  }

  sortSelect(): Locator {
    return this.page.getByTestId('catalog-sort');
  }

  async setSort(sort: ProductSort): Promise<void> {
    await this.sortSelect().selectOption(sort);
  }

  resultCount(): Locator {
    return this.page.getByTestId('catalog-result-count');
  }

  emptyState(): Locator {
    return this.page.getByTestId('catalog-empty');
  }

  clearFiltersButton(): Locator {
    return this.page.getByTestId('catalog-clear');
  }

  async clearFilters(): Promise<void> {
    await this.clearFiltersButton().click();
  }

  paginationNext(): Locator {
    return this.page.getByTestId('catalog-pagination-next');
  }

  paginationPrev(): Locator {
    return this.page.getByTestId('catalog-pagination-prev');
  }

  paginationInfo(): Locator {
    return this.page.getByTestId('catalog-pagination-info');
  }

  productCards(): Locator {
    return this.page.locator('[data-testid^="product-card-"]');
  }
}
