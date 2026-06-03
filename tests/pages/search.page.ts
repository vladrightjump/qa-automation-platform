import type { Locator, Page } from '@playwright/test';

/**
 * Page Object for search affordances — the navbar SearchBox + /search route.
 */
export class SearchPage {
  constructor(private readonly page: Page) {}

  box(): Locator {
    return this.page.getByTestId('search-box');
  }

  async type(text: string): Promise<void> {
    await this.box().fill(text);
  }

  suggestions(): Locator {
    return this.page.getByTestId('search-suggestions');
  }

  suggestion(productId: string): Locator {
    return this.page.getByTestId(`search-suggestion-${productId}`);
  }

  emptySuggestion(): Locator {
    return this.page.getByTestId('search-suggestion-empty');
  }

  async submit(): Promise<void> {
    await this.box().press('Enter');
  }

  async pickSuggestion(productId: string): Promise<void> {
    await this.suggestion(productId).click();
  }

  async gotoResults(q: string): Promise<void> {
    await this.page.goto(`/search?q=${encodeURIComponent(q)}`);
  }

  resultCount(): Locator {
    return this.page.getByTestId('search-result-count');
  }
}
