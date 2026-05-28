import { test, expect } from '../fixtures';

test.describe('reviews (UI)', () => {
  test('@smoke writing a review updates the summary count', async ({
    authedPage,
  }) => {
    await authedPage.goto('/products/prod_widget');

    // Open Reviews tab.
    await authedPage.getByTestId('product-tabs-trigger-reviews').click();
    await expect(authedPage.getByTestId('reviews-tab')).toBeVisible();

    // Click 4th star, fill title + body, submit.
    await authedPage.getByTestId('review-form-rating-star-4').click();
    await authedPage.getByTestId('review-form-title').fill('Great widget');
    await authedPage
      .getByTestId('review-form-body')
      .fill('Has been working fine for weeks.');
    await authedPage.getByTestId('review-form-submit').click();

    // Summary updates.
    await expect(
      authedPage.getByTestId('review-summary-count'),
    ).not.toHaveText('0');
  });

  test('@regression duplicate review surfaces an error toast', async ({
    authedPage,
    api,
    testUser,
  }) => {
    await api.createReview(testUser.token, 'prod_gizmo', {
      rating: 5,
      title: 'First',
      body: 'Body',
    });

    await authedPage.goto('/products/prod_gizmo');
    await authedPage.getByTestId('product-tabs-trigger-reviews').click();
    await authedPage.getByTestId('review-form-rating-star-3').click();
    await authedPage.getByTestId('review-form-title').fill('Second');
    await authedPage.getByTestId('review-form-body').fill('Dup');
    await authedPage.getByTestId('review-form-submit').click();

    await expect(authedPage.getByTestId('toast-error')).toBeVisible();
  });

  test('@regression star rating supports keyboard nav', async ({
    authedPage,
  }) => {
    await authedPage.goto('/products/prod_widget');
    await authedPage.getByTestId('product-tabs-trigger-reviews').click();
    const widget = authedPage.getByTestId('review-form-rating');
    await widget.focus();
    await authedPage.keyboard.press('3');
    await expect(widget).toHaveAttribute('data-value', '3');
    await authedPage.keyboard.press('ArrowRight');
    await expect(widget).toHaveAttribute('data-value', '4');
  });

  test('@regression tabs respond to arrow-key navigation (ARIA contract)', async ({
    authedPage,
  }) => {
    await authedPage.goto('/products/prod_widget');
    const desc = authedPage.getByTestId('product-tabs-trigger-description');
    await desc.focus();
    await authedPage.keyboard.press('ArrowRight');
    await expect(
      authedPage.getByTestId('product-tabs-trigger-specs'),
    ).toHaveAttribute('aria-selected', 'true');
    await authedPage.keyboard.press('End');
    await expect(
      authedPage.getByTestId('product-tabs-trigger-reviews'),
    ).toHaveAttribute('aria-selected', 'true');
  });
});
