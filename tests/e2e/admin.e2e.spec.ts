import { test, expect } from '../fixtures';
import { AdminProductsPage } from '../pages/admin.page';
import { AdminProductFactory } from '../factories/admin-product.factory';

test.describe('admin/products UI', () => {
  test('@smoke admin sees the Admin link and can create + delete a product', async ({
    adminPage,
  }) => {
    await adminPage.goto('/');
    await expect(adminPage.getByTestId('nav-admin')).toBeVisible();

    const admin = new AdminProductsPage(adminPage);
    await admin.goto();

    // Force an early-sorting id so the row lands on page 1 of the admin grid.
    const input = AdminProductFactory.build({
      id: `prod_aaa_${Date.now()}`,
      name: 'E2E Admin Created',
      priceCents: 1234,
      stock: 7,
    });
    await admin.openCreate();
    await admin.fillForm({
      id: input.id,
      name: input.name,
      description: input.description,
      priceCents: input.priceCents,
      stock: input.stock,
      category: input.category,
      tags: 'e2e, new',
    });
    await admin.submit();

    await expect(admin.row(input.id)).toBeVisible();
    await expect(admin.row(input.id)).toContainText('E2E Admin Created');

    // Delete via confirmation modal.
    await admin.openDelete(input.id);
    await admin.confirmDelete();
    await expect(admin.row(input.id)).toHaveCount(0);
  });

  test('@regression admin can edit a product price + stock in a modal', async ({
    adminPage,
    api,
    adminUser,
  }) => {
    const input = AdminProductFactory.build({
      id: `prod_aaa_edit_${Date.now()}`,
      name: 'Edit-me',
      priceCents: 500,
      stock: 1,
    });
    await api.adminCreateProduct(adminUser.token, input);

    const admin = new AdminProductsPage(adminPage);
    await admin.goto();
    await admin.openEdit(input.id);
    await admin.fillForm({ priceCents: 999, stock: 42 });
    await admin.submit();

    await expect(admin.row(input.id)).toContainText('$9.99');
    await expect(admin.row(input.id)).toContainText('42');

    // cleanup
    await api.adminDeleteProduct(adminUser.token, input.id);
  });

  test('@regression non-admin user is redirected away from /admin/products', async ({
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

  test('@regression non-admin user does not see the Admin link', async ({
    authedPage,
  }) => {
    await authedPage.goto('/');
    await expect(authedPage.getByTestId('nav-admin')).toHaveCount(0);
  });

  test('@regression delete modal can be cancelled (ESC) without removing row', async ({
    adminPage,
    api,
    adminUser,
  }) => {
    const input = AdminProductFactory.build({
      id: `prod_aaa_esc_${Date.now()}`,
    });
    await api.adminCreateProduct(adminUser.token, input);

    const admin = new AdminProductsPage(adminPage);
    await admin.goto();
    await admin.openDelete(input.id);
    await adminPage.keyboard.press('Escape');
    await expect(adminPage.getByTestId('admin-delete-modal')).toHaveCount(0);
    await expect(admin.row(input.id)).toBeVisible();

    await api.adminDeleteProduct(adminUser.token, input.id);
  });
});
