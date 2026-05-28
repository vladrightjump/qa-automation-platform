'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  api,
  type AdminProductInput,
  type PagedProducts,
  type Product,
  type ProductCategory,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/ToastQueue';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';

const CATEGORIES: ProductCategory[] = ['gadgets', 'apparel', 'home', 'office'];
const PAGE_SIZE = 20;

interface FormState {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  stock: number;
  category: ProductCategory;
  tags: string;
}

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
  const { token, user, isHydrated } = useAuth();
  const toast = useToast();
  const [data, setData] = useState<PagedProducts | null>(null);
  const [page, setPage] = useState(1);

  const [mode, setMode] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  useEffect(() => {
    if (!isHydrated) return;
    if (!token) {
      window.location.replace('/login');
      return;
    }
    if (user && user.role !== 'ADMIN') {
      toast.push({ variant: 'error', message: 'Admin role required.' });
      window.location.replace('/');
    }
    // toast is excluded — its context value identity changes each render
    // and would cause this effect to loop pushing toasts.
  }, [isHydrated, token, user]);

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
    return <p className="text-gray-500">Loading…</p>;
  }

  return (
    <section className="space-y-4" data-testid="admin-products">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin · Products</h1>
        <button
          onClick={openCreate}
          data-testid="admin-new-product"
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded"
        >
          New product
        </button>
      </div>

      {!data && <p className="text-gray-500">Loading…</p>}
      {data && (
        <>
          <table className="w-full text-sm border bg-white rounded">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-2">ID</th>
                <th className="p-2">Name</th>
                <th className="p-2">Category</th>
                <th className="p-2 text-right">Price</th>
                <th className="p-2 text-right">Stock</th>
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((p) => (
                <tr
                  key={p.id}
                  data-testid={`admin-row-${p.id}`}
                  className="border-t"
                >
                  <td className="p-2 font-mono text-xs">{p.id}</td>
                  <td className="p-2">{p.name}</td>
                  <td className="p-2 capitalize">{p.category}</td>
                  <td className="p-2 text-right">
                    ${(p.priceCents / 100).toFixed(2)}
                  </td>
                  <td className="p-2 text-right">{p.stock}</td>
                  <td className="p-2 text-right space-x-2">
                    <button
                      onClick={() => openEdit(p)}
                      data-testid={`admin-edit-${p.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(p)}
                      data-testid={`admin-delete-${p.id}`}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="space-y-3"
        >
          {mode === 'create' && (
            <label className="block text-sm">
              <span className="text-gray-700">ID</span>
              <input
                required
                pattern="prod_[a-z0-9_]+"
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
                data-testid="admin-form-id"
                className="mt-1 w-full border rounded px-2 py-1"
              />
            </label>
          )}
          <label className="block text-sm">
            <span className="text-gray-700">Name</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              data-testid="admin-form-name"
              className="mt-1 w-full border rounded px-2 py-1"
            />
          </label>
          <label className="block text-sm">
            <span className="text-gray-700">Description</span>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              data-testid="admin-form-description"
              className="mt-1 w-full border rounded px-2 py-1"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-sm">
              <span className="text-gray-700">Price (cents)</span>
              <input
                required
                type="number"
                min={0}
                value={form.priceCents}
                onChange={(e) =>
                  setForm({ ...form, priceCents: Number(e.target.value) })
                }
                data-testid="admin-form-price"
                className="mt-1 w-full border rounded px-2 py-1"
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-700">Stock</span>
              <input
                required
                type="number"
                min={0}
                value={form.stock}
                onChange={(e) =>
                  setForm({ ...form, stock: Number(e.target.value) })
                }
                data-testid="admin-form-stock"
                className="mt-1 w-full border rounded px-2 py-1"
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="text-gray-700">Category</span>
            <select
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value as ProductCategory })
              }
              data-testid="admin-form-category"
              className="mt-1 w-full border rounded px-2 py-1 bg-white"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-gray-700">Tags (comma-separated)</span>
            <input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              data-testid="admin-form-tags"
              className="mt-1 w-full border rounded px-2 py-1"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setMode(null)}
              data-testid="admin-form-cancel"
              className="px-3 py-1.5 border rounded text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="admin-form-submit"
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded"
            >
              Save
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete product?"
        testId="admin-delete-modal"
      >
        <p className="text-sm text-gray-700 mb-4">
          This will permanently delete{' '}
          <span className="font-mono">{deleteTarget?.id}</span>. This cannot be
          undone.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setDeleteTarget(null)}
            data-testid="admin-delete-cancel"
            className="px-3 py-1.5 border rounded text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => void confirmDelete()}
            data-testid="admin-delete-confirm"
            className="px-3 py-1.5 bg-red-600 text-white text-sm rounded"
          >
            Delete
          </button>
        </div>
      </Modal>
    </section>
  );
}
