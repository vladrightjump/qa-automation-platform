import { test, expect } from '../fixtures';
import { ProductFactory } from '../factories/product.factory';

test.describe('cart quantity + remove modal (UI)', () => {
  test('@smoke quantity stepper updates the line subtotal', async ({
    authedPage,
    api,
    db,
    testUser,
    cart,
  }) => {
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 10, priceCents: 1000 }),
    });
    await api.addToCart(testUser.token, product.id, 1);

    await cart.goto();
    await expect(
      authedPage.getByTestId(`cart-line-subtotal-${product.id}`),
    ).toContainText('$10.00');

    // Each click reads from the current (server-confirmed) cart state, so
    // wait for the subtotal to update between clicks instead of racing.
    await authedPage.getByTestId(`cart-qty-inc-${product.id}`).click();
    await expect(
      authedPage.getByTestId(`cart-line-subtotal-${product.id}`),
    ).toContainText('$20.00');
    await authedPage.getByTestId(`cart-qty-inc-${product.id}`).click();
    await expect(
      authedPage.getByTestId(`cart-line-subtotal-${product.id}`),
    ).toContainText('$30.00');

    await authedPage.getByTestId(`cart-qty-dec-${product.id}`).click();
    await expect(
      authedPage.getByTestId(`cart-line-subtotal-${product.id}`),
    ).toContainText('$20.00');
  });

  test('@regression remove button opens confirmation modal and Cancel keeps the item', async ({
    authedPage,
    api,
    db,
    testUser,
    cart,
  }) => {
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 5, priceCents: 500 }),
    });
    await api.addToCart(testUser.token, product.id, 1);

    await cart.goto();
    await authedPage.getByTestId(`cart-remove-${product.id}`).click();
    await expect(
      authedPage.getByTestId('cart-remove-modal'),
    ).toBeVisible();
    await authedPage.getByTestId('cart-remove-cancel').click();
    await expect(
      authedPage.getByTestId('cart-remove-modal'),
    ).toHaveCount(0);
    // Item still there.
    await expect(
      authedPage.getByTestId(`cart-item-${product.id}`),
    ).toBeVisible();
  });

  test('@regression remove confirmation actually removes the item', async ({
    authedPage,
    api,
    db,
    testUser,
    cart,
  }) => {
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 5, priceCents: 500 }),
    });
    await api.addToCart(testUser.token, product.id, 1);

    await cart.goto();
    await authedPage.getByTestId(`cart-remove-${product.id}`).click();
    await authedPage.getByTestId('cart-remove-confirm').click();
    await expect(
      authedPage.getByTestId(`cart-item-${product.id}`),
    ).toHaveCount(0);
  });

  test('@regression quantity is clamped to product stock by the API', async ({
    authedPage,
    api,
    db,
    testUser,
    cart,
  }) => {
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 2, priceCents: 100 }),
    });
    await api.addToCart(testUser.token, product.id, 1);

    await cart.goto();
    const input = authedPage.getByTestId(`cart-qty-input-${product.id}`);
    await input.fill('99');
    await input.blur();
    // Wait for the server to clamp and the cart to refetch.
    await expect(input).toHaveValue('2');
  });
});
