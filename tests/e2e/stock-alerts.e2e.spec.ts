import { test, expect } from '../fixtures';
import { ProductFactory } from '../factories/product.factory';

test.describe('back-in-stock alerts (UI)', () => {
  test('subscribe to a back-in-stock alert on an out-of-stock product', {
    tag: ['@smoke', '@stock-alert', '@sanity'],
  }, async ({ authedPage, db, testUser }) => {
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 0 }),
    });

    await authedPage.goto(`/products/${product.id}`);

    const toggle = authedPage.getByTestId('stock-alert-toggle');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveText('Notify me');
    await toggle.click();

    await expect(toggle).toHaveText('Cancel alert');
    await expect(toggle).toHaveAttribute('data-subscribed', 'true');

    // Ground-truth side-effect: an alert row exists for this user + product.
    await expect
      .poll(() =>
        db.stockAlert.count({
          where: { userId: testUser.id, productId: product.id },
        }),
      )
      .toBe(1);
  });

  test('the alert control is hidden for an in-stock product', {
    tag: ['@regression', '@stock-alert'],
  }, async ({ authedPage, db }) => {
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 8 }),
    });

    await authedPage.goto(`/products/${product.id}`);
    await expect(authedPage.getByTestId('stock-alert')).toHaveCount(0);
  });
});
