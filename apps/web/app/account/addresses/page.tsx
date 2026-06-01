'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, type Address, type AddressInput } from '@/lib/api';
import { useRequireAuth } from '@/lib/use-require-auth';
import { useToast } from '@/components/ui/ToastQueue';
import Modal from '@/components/ui/Modal';

const EMPTY_FORM: AddressInput = {
  label: '',
  name: '',
  line1: '',
  line2: '',
  city: '',
  postalCode: '',
  country: 'US',
  isDefault: false,
};

export default function AddressesPage() {
  const toast = useToast();
  const { token, isHydrated } = useRequireAuth();
  const [items, setItems] = useState<Address[] | null>(null);
  const [mode, setMode] = useState<{ kind: 'create' } | { kind: 'edit'; id: string } | null>(
    null,
  );
  const [form, setForm] = useState<AddressInput>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Address | null>(null);

  const reload = useCallback(async () => {
    if (!token) return;
    try {
      setItems(await api.listAddresses(token));
    } catch (e) {
      toast.push({ variant: 'error', message: (e as Error).message });
    }
  }, [token, toast]);

  useEffect(() => {
    if (!isHydrated || !token) return;
    void reload();
  }, [isHydrated, token, reload]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setMode({ kind: 'create' });
  }

  function openEdit(a: Address) {
    setForm({
      label: a.label,
      name: a.name,
      line1: a.line1,
      line2: a.line2 ?? '',
      city: a.city,
      postalCode: a.postalCode,
      country: a.country,
      isDefault: a.isDefault,
    });
    setMode({ kind: 'edit', id: a.id });
  }

  async function submit() {
    if (!token || !mode) return;
    try {
      if (mode.kind === 'create') {
        await api.createAddress(token, form);
        toast.push({ variant: 'success', message: 'Address created' });
      } else {
        await api.updateAddress(token, mode.id, form);
        toast.push({ variant: 'success', message: 'Address updated' });
      }
      setMode(null);
      await reload();
    } catch (e) {
      toast.push({ variant: 'error', message: (e as Error).message });
    }
  }

  async function confirmDelete() {
    if (!token || !deleteTarget) return;
    try {
      await api.deleteAddress(token, deleteTarget.id);
      toast.push({ variant: 'success', message: 'Address removed' });
      setDeleteTarget(null);
      await reload();
    } catch (e) {
      toast.push({ variant: 'error', message: (e as Error).message });
    }
  }

  if (!isHydrated || !token) return <p className="text-ink-faint">Loading…</p>;

  return (
    <section className="space-y-4" data-testid="addresses-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Addresses</h1>
        <button
          onClick={openCreate}
          data-testid="addresses-new"
          className="px-3 py-1.5 bg-clay-500 text-card text-sm rounded"
        >
          Add address
        </button>
      </div>

      {!items && <p className="text-ink-faint">Loading…</p>}
      {items && items.length === 0 && (
        <p
          data-testid="addresses-empty"
          className="border rounded p-6 bg-card text-center text-ink-soft"
        >
          No saved addresses yet.
        </p>
      )}
      {items && items.length > 0 && (
        <ul className="grid sm:grid-cols-2 gap-3">
          {items.map((a) => (
            <li
              key={a.id}
              data-testid={`address-card-${a.id}`}
              className="border rounded p-3 bg-card text-sm"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">
                    {a.label}
                    {a.isDefault && (
                      <span
                        data-testid={`address-default-${a.id}`}
                        className="ml-2 text-xs text-green-700"
                      >
                        default
                      </span>
                    )}
                  </div>
                  <div>{a.name}</div>
                  <div className="text-ink-soft">
                    {a.line1}
                    {a.line2 ? `, ${a.line2}` : ''}, {a.city} {a.postalCode}{' '}
                    {a.country}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 text-xs">
                  <button
                    onClick={() => openEdit(a)}
                    data-testid={`address-edit-${a.id}`}
                    className="text-clay-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(a)}
                    data-testid={`address-delete-${a.id}`}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={mode !== null}
        onClose={() => setMode(null)}
        title={mode?.kind === 'edit' ? 'Edit address' : 'New address'}
        testId="address-modal"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="space-y-2 text-sm"
        >
          <label className="block">
            Label
            <input
              required
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              data-testid="address-form-label"
              className="mt-1 w-full border rounded px-2 py-1"
            />
          </label>
          <label className="block">
            Full name
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              data-testid="address-form-name"
              className="mt-1 w-full border rounded px-2 py-1"
            />
          </label>
          <label className="block">
            Line 1
            <input
              required
              value={form.line1}
              onChange={(e) => setForm({ ...form, line1: e.target.value })}
              data-testid="address-form-line1"
              className="mt-1 w-full border rounded px-2 py-1"
            />
          </label>
          <div className="grid grid-cols-3 gap-2">
            <label className="block col-span-2">
              City
              <input
                required
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                data-testid="address-form-city"
                className="mt-1 w-full border rounded px-2 py-1"
              />
            </label>
            <label className="block">
              Postal
              <input
                required
                value={form.postalCode}
                onChange={(e) =>
                  setForm({ ...form, postalCode: e.target.value })
                }
                data-testid="address-form-postal"
                className="mt-1 w-full border rounded px-2 py-1"
              />
            </label>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isDefault ?? false}
              onChange={(e) =>
                setForm({ ...form, isDefault: e.target.checked })
              }
              data-testid="address-form-default"
            />
            Set as default
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setMode(null)}
              data-testid="address-form-cancel"
              className="px-3 py-1.5 border rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="address-form-submit"
              className="px-3 py-1.5 bg-clay-500 text-card rounded"
            >
              Save
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete address?"
        testId="address-delete-modal"
      >
        <p className="text-sm mb-3">
          Remove “{deleteTarget?.label}”? This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setDeleteTarget(null)}
            data-testid="address-delete-cancel"
            className="px-3 py-1.5 border rounded text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => void confirmDelete()}
            data-testid="address-delete-confirm"
            className="px-3 py-1.5 bg-red-600 text-card rounded text-sm"
          >
            Delete
          </button>
        </div>
      </Modal>
    </section>
  );
}
