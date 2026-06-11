'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  api,
  type AdminProductInput,
  type PagedProducts,
  type Product,
} from '@/lib/api';
import { useRequireAuth } from '@/lib/use-require-auth';
import { useToast } from '@/components/ui/ToastQueue';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import PageHeader from '@/components/ui/PageHeader';
import PageSection from '@/components/ui/PageSection';
import ProductTable from '@/components/features/admin/ProductTable';
import ProductForm, {
  type ProductFormState,
} from '@/components/features/admin/ProductForm';

const PAGE_SIZE = 20;

type FormState = ProductFormState;

const EMPTY_FORM: FormState = {
  id: '',
  name: '',
  description: '',
  priceCents: 0,
  stock: 0,
  category: 'gadgets',
  tags: '',
};

function fromProduct(p: Product): FormState {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? '',
    priceCents: p.priceCents,
    stock: p.stock,
    category: p.category,
    tags: p.tags.join(', '),
  };
}

function toInput(form: FormState): AdminProductInput {
  return {
    id: form.id,
    name: form.name,
    description: form.description || null,
    priceCents: form.priceCents,
    stock: form.stock,
    category: form.category,
    tags: form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
  };
}

export default function AdminProductsPage() {
  const { token, user, isHydrated } = useRequireAuth({ requireAdmin: true });
  const toast = useToast();
  const [data, setData] = useState<PagedProducts | null>(null);
  const [page, setPage] = useState(1);

  const [mode, setMode] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const reload = useCallback(async () => {
    if (!token) return;
    try {
      const result = await api.adminListProducts(token, page, PAGE_SIZE);
      setData(result);
    } catch (e) {
      toast.push({ variant: 'error', message: (e as Error).message });
    }
  }, [token, page, toast]);

  useEffect(() => {
    void reload();
  }, [reload]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setMode('create');
  }

  function openEdit(p: Product) {
    setForm(fromProduct(p));
    setMode('edit');
  }

  async function submit() {
    if (!token) return;
    try {
      if (mode === 'create') {
        await api.adminCreateProduct(token, toInput(form));
        toast.push({ variant: 'success', message: `Created ${form.id}` });
      } else if (mode === 'edit') {
        const { id, ...patch } = toInput(form);
        await api.adminUpdateProduct(token, id!, patch);
        toast.push({ variant: 'success', message: `Updated ${id}` });
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
      await api.adminDeleteProduct(token, deleteTarget.id);
      toast.push({
        variant: 'success',
        message: `Deleted ${deleteTarget.id}`,
      });
      setDeleteTarget(null);
      await reload();
    } catch (e) {
      toast.push({ variant: 'error', message: (e as Error).message });
    }
  }

  if (!isHydrated || !user || user.role !== 'ADMIN') {
    return <p className="text-ink-faint">Loading…</p>;
  }

  return (
    <PageSection gap={4} testId="admin-products">
      <PageHeader
        title="Admin · Products"
        action={
          <button
            onClick={openCreate}
            data-testid="admin-new-product"
            className="px-3 py-2 bg-clay-500 hover:bg-clay-600 text-card text-sm rounded-lg font-medium active:scale-95 transition-colors"
          >
            New product
          </button>
        }
      />

      {!data && <p className="text-ink-faint">Loading…</p>}
      {data && (
        <>
          <ProductTable
            rows={data.items}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
          />
          {data.total > PAGE_SIZE && (
            <Pagination
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              onChange={setPage}
              testId="admin-pagination"
            />
          )}
        </>
      )}

      <Modal
        open={mode !== null}
        onClose={() => setMode(null)}
        title={mode === 'create' ? 'New product' : `Edit ${form.id}`}
        testId="admin-product-modal"
      >
        {mode !== null && (
          <ProductForm
            mode={mode}
            value={form}
            onChange={setForm}
            onCancel={() => setMode(null)}
            onSubmit={() => void submit()}
          />
        )}
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete product?"
        testId="admin-delete-modal"
      >
        <p className="text-sm text-ink-soft mb-4">
          This will permanently delete{' '}
          <span className="font-mono">{deleteTarget?.id}</span>. This cannot be
          undone.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setDeleteTarget(null)}
            data-testid="admin-delete-cancel"
            className="px-3 py-2 border border-line-strong rounded-lg text-sm text-ink hover:bg-paper-deep transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => void confirmDelete()}
            data-testid="admin-delete-confirm"
            className="px-3 py-2 bg-danger-500 hover:bg-danger-600 text-card text-sm rounded-lg font-medium transition-colors"
          >
            Delete
          </button>
        </div>
      </Modal>
    </PageSection>
  );
}
