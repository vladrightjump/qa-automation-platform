'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, type Address, type AddressInput } from '@/lib/api';
import { useRequireAuth } from '@/lib/use-require-auth';
import { useToast } from '@/components/ui/ToastQueue';
import Modal from '@/components/ui/Modal';
import PageHeader from '@/components/ui/PageHeader';
import PageSection from '@/components/ui/PageSection';
import AddressForm from '@/components/features/account/AddressForm';

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
    <PageSection gap={4} testId="addresses-page">
      <PageHeader
        title="Addresses"
        action={
          <button
            onClick={openCreate}
            data-testid="addresses-new"
            className="px-3 py-2 bg-clay-500 hover:bg-clay-600 text-card text-sm rounded-lg font-medium active:scale-95 transition-colors"
          >
            Add address
          </button>
        }
      />

      {!items && <p className="text-ink-faint">Loading…</p>}
      {items && items.length === 0 && (
        <p
          data-testid="addresses-empty"
          className="border border-line rounded-[10px] p-6 bg-card text-center text-ink-soft"
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
              className="border border-line rounded-[10px] p-4 bg-card text-sm hover:bg-paper-deep transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">
                    {a.label}
                    {a.isDefault && (
                      <span
                        data-testid={`address-default-${a.id}`}
                        className="ml-2 text-xs text-sage-500"
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
                    className="text-ink-faint hover:text-danger-500 transition-colors"
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
        <AddressForm
          value={form}
          onChange={setForm}
          onCancel={() => setMode(null)}
          onSubmit={() => void submit()}
        />
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
            className="px-3 py-2 border border-line-strong rounded-lg text-sm text-ink hover:bg-paper-deep transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => void confirmDelete()}
            data-testid="address-delete-confirm"
            className="px-3 py-2 bg-danger-500 hover:bg-danger-600 text-card rounded-lg text-sm font-medium transition-colors"
          >
            Delete
          </button>
        </div>
      </Modal>
    </PageSection>
  );
}
