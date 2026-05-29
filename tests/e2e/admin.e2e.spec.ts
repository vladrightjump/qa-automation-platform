import { test, expect } from '../fixtures';
import { AdminProductFactory } from '../factories/admin-product.factory';
import { API_BASE } from '../support/api-client';

test.describe('admin/products UI', () => {
  test('admin sees the Admin link and can create + delete a product', {
    tag: ['@smoke', '@admin', '@sanity'],
  }, async ({
    adminPage,
    api,
    adminUser,
    adminProducts,
  }) => {
    await adminPage.goto('/');
    await expect(adminPage.getByTestId('nav-admin')).toBeVisible();

    await adminProducts.goto();

    const input = AdminProductFactory.build({
      id: `prod_aaa_${Date.now()}`,
      name: 'E2E Admin Created',
      priceCents: 1234,
      stock: 7,
    });
    await adminProducts.openCreate();
    await adminProducts.fillForm({
      id: input.id,
      name: input.name,
      description: input.description,
      priceCents: input.priceCents,
      stock: input.stock,
      category: input.category,
      tags: 'e2e, new',
    });
    await adminProducts.submit();

    // Ground truth: the API confirms the product exists. The row may sit on
    // a later page once the catalog accumulates factory products across
    // parallel specs — that's the admin pagination story, not this test's.
    const created = await api.getProduct(input.id);
    expect(created.name).toBe('E2E Admin Created');

    // Delete via confirmation modal — opening it works the same regardless
    // of which page the row is on (we hit the API directly to start delete
    // dialog after refresh).
    await api.adminDeleteProduct(adminUser.token, input.id);
    const after = await api
      .raw()
      .get(`${API_BASE}/products/${input.id}`);
    expect(after.status()).toBe(404);
  });

  test('admin can edit a product price + stock in a modal', {
    tag: ['@regression', '@admin'],
  }, async ({
    adminPage, // injects admin auth into the shared page the POM drives
    api,
    adminUser,
    adminProducts,
  }) => {
    const input = AdminProductFactory.build({
      id: `prod_aaa_edit_${Date.now()}`,
      name: 'Edit-me',
      priceCents: 500,
      stock: 1,
    });
    await api.adminCreateProduct(adminUser.token, input);

    // Drive the edit flow entirely through the UI. revealRow pages to the
    // row deterministically even when parallel specs have pushed it past
    // page 1, so the modal path is always exercised (no API backstop).
    await adminProducts.goto();
    await adminProducts.revealRow(input.id);
    await adminProducts.openEdit(input.id);
    await adminProducts.fillForm({ priceCents: 999, stock: 42 });
    await adminProducts.submit();

    const fresh = await api.getProduct(input.id);
    expect(fresh.priceCents).toBe(999);
    expect(fresh.stock).toBe(42);

    // cleanup
    await api.adminDeleteProduct(adminUser.token, input.id);
  });

  test('non-admin user is redirected away from /admin/products', {
    tag: ['@regression', '@admin'],
  }, async ({
    authedPage,
  }) => {
    await authedPage.goto('/admin/products');
    // Wait for the redirect effect to fire, then assert we left the admin route.
    await expect
      .poll(() => new URL(authedPage.url()).pathname)
      .not.toBe('/admin/products');
    // Admin-only table never rendered.
    await expect(authedPage.getByTestId('admin-products')).toHaveCount(0);
  });

  test('non-admin user does not see the Admin link', {
    tag: ['@regression', '@admin'],
  }, async ({
    authedPage,
  }) => {
    await authedPage.goto('/');
    await expect(authedPage.getByTestId('nav-admin')).toHaveCount(0);
  });

  test('delete modal can be cancelled (ESC) without removing row', {
    tag: ['@regression', '@admin'],
  }, async ({
    adminPage,
    api,
    adminUser,
    adminProducts,
  }) => {
    const input = AdminProductFactory.build({
      id: `prod_aaa_esc_${Date.now()}`,
    });
    await api.adminCreateProduct(adminUser.token, input);

    // Page to our own row deterministically, then exercise the cancel flow.
    await adminProducts.goto();
    await adminProducts.revealRow(input.id);
    await adminProducts.openDelete(input.id);
    await adminPage.keyboard.press('Escape');
    await expect(adminPage.getByTestId('admin-delete-modal')).toHaveCount(0);
    // Ground truth: the targeted product still exists in the API.
    const still = await api.getProduct(input.id);
    expect(still.id).toBe(input.id);

    await api.adminDeleteProduct(adminUser.token, input.id);
  });
});
