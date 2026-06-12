import type { Locator, Page } from '@playwright/test';

/**
 * Page Object for the orders list + detail. The cancel-order flow lives
 * here because it's the only mutation the user can drive from /orders.
 */
export class OrdersPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/orders');
  }

  ordersList(): Locator {
    return this.page.getByTestId('orders-page');
  }

  orderRow(orderId: string): Locator {
    return this.page.getByTestId(`orders-row-${orderId}`);
  }

  orderStatus(): Locator {
    return this.page.getByTestId('order-status');
  }

  cancelButton(): Locator {
    return this.page.getByTestId('order-cancel');
  }

  confirmCancel(): Locator {
    return this.page.getByTestId('order-cancel-confirm');
  }

  async openOrder(orderId: string): Promise<void> {
    await this.page.goto(`/orders/${orderId}`);
  }

  async cancel(orderId: string): Promise<void> {
    await this.openOrder(orderId);
    await this.cancelButton().click();
    await this.confirmCancel().click();
  }
}
