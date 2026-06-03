import type { Locator, Page } from '@playwright/test';
import type { Locale, ProductCategory, ProductSort } from '@qa/contracts';

/**
 * Page Object for the product list / storefront home.
 *
 * Selector strategy:
 *   - Visible action buttons → `getByRole('button', { name: ... })`.
 *   - Form fields with visible labels → `getByLabel`.
 *   - Free-text search → `getByPlaceholder`.
 *   - Container/structural locators that embed dynamic productIds keep
 *     `data-testid` since those have no accessible-name equivalent.
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
    // Chained locator: scope to the product card, then pick the button
    // by its visible name. The OR in the regex covers both states so
    // the locator stays stable when stock drops to zero.
    await this.productCard(productId)
      .getByRole('button', { name: /add to cart|out of stock/i })
      .click();
  }

  cartCount(): Locator {
    return this.page.getByTestId('cart-count');
  }

  // ---------- catalog filters / search / sort / pagination ----------

  searchInput(): Locator {
    return this.page.getByPlaceholder('Find products…');
  }

  async search(query: string): Promise<void> {
    await this.searchInput().fill(query);
  }

  categoryCheckbox(category: ProductCategory): Locator {
    // Visible labels are capitalized; map directly.
    const label =
      category.charAt(0).toUpperCase() + category.slice(1);
    return this.page.getByRole('checkbox', { name: label });
  }

  async toggleCategory(category: ProductCategory): Promise<void> {
    await this.categoryCheckbox(category).click();
  }

  sortSelect(): Locator {
    return this.page.getByLabel('Sort');
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
    return this.page.getByRole('button', { name: 'Clear filters' }).first();
  }

  async clearFilters(): Promise<void> {
    await this.clearFiltersButton().click();
  }

  paginationNext(): Locator {
    return this.page
      .getByTestId('catalog-pagination')
      .getByRole('button', { name: 'Next' });
  }

  paginationPrev(): Locator {
    return this.page
      .getByTestId('catalog-pagination')
      .getByRole('button', { name: 'Prev' });
  }

  paginationInfo(): Locator {
    return this.page.getByTestId('catalog-pagination-info');
  }

  productCards(): Locator {
    return this.page.locator('[data-testid^="product-card-"]');
  }

  // --- i18n / geo ---

  localeSwitcher(): Locator {
    return this.page.getByTestId('locale-switcher');
  }

  async selectLocale(locale: Locale): Promise<void> {
    await this.localeSwitcher().selectOption(locale);
  }

  productPrice(productId: string): Locator {
    return this.page.getByTestId(`product-price-${productId}`);
  }

  geoBanner(): Locator {
    return this.page.getByTestId('geo-banner');
  }

  geoSuggestion(): Locator {
    return this.page.getByTestId('geo-suggestion');
  }

  async acceptGeo(): Promise<void> {
    await this.page.getByTestId('geo-accept').click();
  }

  async dismissGeo(): Promise<void> {
    await this.page.getByTestId('geo-dismiss').click();
  }

  geoFallback(): Locator {
    return this.page.getByTestId('geo-fallback');
  }

  geoRegionSelect(): Locator {
    return this.page.getByTestId('geo-region-select');
  }
}
