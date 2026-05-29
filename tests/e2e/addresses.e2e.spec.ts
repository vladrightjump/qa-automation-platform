import { test, expect } from '../fixtures';
import { AddressFactory } from '../factories/address.factory';

test.describe('addresses (UI)', () => {
  test('create, edit, and delete an address via modals', {
    tag: ['@smoke', '@addresses', '@sanity'],
  }, async ({
    authedPage,
    addresses,
  }) => {
    await addresses.goto();
    await expect(authedPage.getByTestId('addresses-page')).toBeVisible();

    const fresh = AddressFactory.build({ label: 'Home' });
    await addresses.openCreate();
    await addresses.fillForm({
      label: fresh.label,
      name: fresh.name,
      line1: fresh.line1,
      city: fresh.city,
      postalCode: fresh.postalCode,
    });
    await addresses.submit();
    // Empty state gone, at least one card present.
    await expect(authedPage.getByTestId('addresses-empty')).toHaveCount(0);
    const card = authedPage.locator('[data-testid^="address-card-"]').first();
    await expect(card).toContainText('Home');

    // Edit relabel via the modal.
    const id = await card.getAttribute('data-testid');
    expect(id).toMatch(/^address-card-/);
    const addressId = id!.replace(/^address-card-/, '');
    await addresses.openEdit(addressId);
    await addresses.fillForm({ label: 'Renamed' });
    await addresses.submit();
    await expect(addresses.card(addressId)).toContainText('Renamed');

    // Delete with confirmation modal.
    await addresses.openDelete(addressId);
    await addresses.confirmDelete();
    await expect(addresses.card(addressId)).toHaveCount(0);
  });

  test('marking an address default un-flags the previous default', {
    tag: ['@regression', '@addresses'],
  }, async ({
    authedPage,
    api,
    testUser,
    addresses,
  }) => {
    const a = await api.createAddress(
      testUser.token,
      AddressFactory.build({ isDefault: true }),
    );
    const b = await api.createAddress(
      testUser.token,
      AddressFactory.build({ isDefault: false }),
    );

    await addresses.goto();
    await expect(addresses.defaultBadge(a.id)).toBeVisible();
    await expect(addresses.defaultBadge(b.id)).toHaveCount(0);

    await addresses.openEdit(b.id);
    await addresses.fillForm({ isDefault: true });
    await addresses.submit();

    await expect(addresses.defaultBadge(b.id)).toBeVisible();
    await expect(addresses.defaultBadge(a.id)).toHaveCount(0);
  });
});
