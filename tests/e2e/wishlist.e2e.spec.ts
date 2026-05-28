import { test, expect } from '../fixtures';

test.describe('wishlist (UI)', () => {
  test('@smoke heart icon toggles optimistically and persists across navigation', async ({
    authedPage,
  }) => {
    await authedPage.goto('/products/prod_widget');
    const heart = authedPage.getByTestId('wishlist-toggle-prod_widget');
    await expect(heart).toHaveAttribute('aria-pressed', 'false');
    await heart.click();
    await expect(heart).toHaveAttribute('aria-pressed', 'true');

    // Navigate away then back — heart should still be filled.
    await authedPage.goto('/orders');
    await authedPage.goto('/products/prod_widget');
    await expect(
      authedPage.getByTestId('wishlist-toggle-prod_widget'),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  test('@regression /wishlist lists added items and move-to-cart removes them', async ({
    authedPage,
    api,
    testUser,
    db,
  }) => {
    await api.addToWishlist(testUser.token, 'prod_gizmo');

    await authedPage.goto('/wishlist');
    await expect(
      authedPage.getByTestId('wishlist-item-prod_gizmo'),
    ).toBeVisible();

    await authedPage.getByTestId('wishlist-move-prod_gizmo').click();
    await expect(
      authedPage.getByTestId('wishlist-item-prod_gizmo'),
    ).toHaveCount(0);

    // Cart got it.
    const cart = await db.cart.findUnique({
      where: { userId: testUser.id },
      include: { items: true },
    });
    expect(cart?.items.find((i) => i.productId === 'prod_gizmo')).toBeDefined();
  });

  test('@regression empty state renders when wishlist is empty', async ({
    authedPage,
  }) => {
    await authedPage.goto('/wishlist');
    await expect(authedPage.getByTestId('wishlist-empty')).toBeVisible();
  });
});
