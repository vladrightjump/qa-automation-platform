import { test, expect } from '../fixtures';
import { API_BASE } from '../support/api-client';
import { AddressFactory } from '../factories/address.factory';

test.describe('addresses', () => {
  test('authed user can CRUD their addresses', { tag: ['@smoke', '@addresses'] }, async ({
    api,
    testUser,
  }) => {
    const created = await api.createAddress(
      testUser.token,
      AddressFactory.build({ label: 'Home', isDefault: true }),
    );
    expect(created.userId).toBe(testUser.id);
    expect(created.isDefault).toBe(true);

    const list = await api.listAddresses(testUser.token);
    expect(list.map((a) => a.id)).toContain(created.id);

    const updated = await api.updateAddress(testUser.token, created.id, {
      label: 'Renamed',
    });
    expect(updated.label).toBe('Renamed');

    await api.deleteAddress(testUser.token, created.id);
    const after = await api.listAddresses(testUser.token);
    expect(after.map((a) => a.id)).not.toContain(created.id);
  });

  test('unauthenticated address access returns 401', { tag: ['@regression', '@addresses'] }, async ({
    api,
  }) => {
    const res = await api.raw().get(`${API_BASE}/addresses`);
    expect(res.status()).toBe(401);
  });

  test('cannot edit another user’s address (403)', { tag: ['@regression', '@addresses'] }, async ({
    api,
    testUser,
  }) => {
    const a = await api.createAddress(
      testUser.token,
      AddressFactory.build(),
    );
    // Different user
    const otherCreds = {
      email: `other-${Date.now()}@qa-test.local`,
      password: 'Password123!',
    };
    const other = await api.register(otherCreds.email, otherCreds.password);
    const res = await api.raw().patch(`${API_BASE}/addresses/${a.id}`, {
      headers: { Authorization: `Bearer ${other.token}` },
      data: { label: 'hacked' },
    });
    expect(res.status()).toBe(403);
    await api.deleteAddress(testUser.token, a.id);
  });

  test('setting an address default un-flags the previous default', { tag: ['@regression', '@addresses'] }, async ({
    api,
    testUser,
  }) => {
    const a = await api.createAddress(
      testUser.token,
      AddressFactory.build({ isDefault: true }),
    );
    const b = await api.createAddress(
      testUser.token,
      AddressFactory.build({ isDefault: true }),
    );

    const list = await api.listAddresses(testUser.token);
    const aAfter = list.find((x) => x.id === a.id)!;
    const bAfter = list.find((x) => x.id === b.id)!;
    expect(aAfter.isDefault).toBe(false);
    expect(bAfter.isDefault).toBe(true);
  });

  test('validation rejects empty required fields with 400', { tag: ['@regression', '@addresses'] }, async ({
    api,
    testUser,
  }) => {
    const res = await api.raw().post(`${API_BASE}/addresses`, {
      headers: { Authorization: `Bearer ${testUser.token}` },
      data: { label: '', name: '', line1: '', city: '', postalCode: '' },
    });
    expect(res.status()).toBe(400);
  });
});
