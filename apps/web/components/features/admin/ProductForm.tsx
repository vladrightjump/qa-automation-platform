'use client';

import type { ProductCategory } from '@/lib/api';
import FormField from '@/components/ui/FormField';
import TextInput from '@/components/ui/TextInput';
import Textarea from '@/components/ui/Textarea';

export interface ProductFormState {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  stock: number;
  category: ProductCategory;
  tags: string;
}

const CATEGORIES: ProductCategory[] = ['gadgets', 'apparel', 'home', 'office'];

interface ProductFormProps {
  mode: 'create' | 'edit';
  value: ProductFormState;
  onChange: (next: ProductFormState) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export default function ProductForm({
  mode,
  value,
  onChange,
  onCancel,
  onSubmit,
}: ProductFormProps) {
  const update = (patch: Partial<ProductFormState>) => onChange({ ...value, ...patch });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-3"
    >
      {mode === 'create' && (
        <FormField label="ID" htmlFor="admin-form-id">
          <TextInput
            id="admin-form-id"
            required
            pattern="prod_[a-z0-9_]+"
            value={value.id}
            onChange={(e) => update({ id: e.target.value })}
            data-testid="admin-form-id"
          />
        </FormField>
      )}
      <FormField label="Name" htmlFor="admin-form-name">
        <TextInput
          id="admin-form-name"
          required
          value={value.name}
          onChange={(e) => update({ name: e.target.value })}
          data-testid="admin-form-name"
        />
      </FormField>
      <FormField label="Description" htmlFor="admin-form-description">
        <Textarea
          id="admin-form-description"
          value={value.description}
          onChange={(e) => update({ description: e.target.value })}
          data-testid="admin-form-description"
        />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Price (cents)" htmlFor="admin-form-price">
          <TextInput
            id="admin-form-price"
            required
            type="number"
            min={0}
            value={value.priceCents}
            onChange={(e) => update({ priceCents: Number(e.target.value) })}
            data-testid="admin-form-price"
          />
        </FormField>
        <FormField label="Stock" htmlFor="admin-form-stock">
          <TextInput
            id="admin-form-stock"
            required
            type="number"
            min={0}
            value={value.stock}
            onChange={(e) => update({ stock: Number(e.target.value) })}
            data-testid="admin-form-stock"
          />
        </FormField>
      </div>
      <FormField label="Category" htmlFor="admin-form-category">
        <select
          id="admin-form-category"
          value={value.category}
          onChange={(e) =>
            update({ category: e.target.value as ProductCategory })
          }
          data-testid="admin-form-category"
          className="w-full bg-card border border-line-strong rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-clay-500 transition-colors"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Tags (comma-separated)" htmlFor="admin-form-tags">
        <TextInput
          id="admin-form-tags"
          value={value.tags}
          onChange={(e) => update({ tags: e.target.value })}
          data-testid="admin-form-tags"
        />
      </FormField>
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          data-testid="admin-form-cancel"
          className="px-3 py-2 border border-line-strong rounded-lg text-sm text-ink hover:bg-paper-deep transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          data-testid="admin-form-submit"
          className="px-3 py-2 bg-clay-500 hover:bg-clay-600 text-card text-sm rounded-lg font-medium active:scale-95 transition-colors"
        >
          Save
        </button>
      </div>
    </form>
  );
}
