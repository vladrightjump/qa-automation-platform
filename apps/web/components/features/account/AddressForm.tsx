'use client';

import type { AddressInput } from '@/lib/api';
import FormField from '@/components/ui/FormField';
import TextInput from '@/components/ui/TextInput';

interface AddressFormProps {
  value: AddressInput;
  onChange: (next: AddressInput) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export default function AddressForm({
  value,
  onChange,
  onCancel,
  onSubmit,
}: AddressFormProps) {
  const update = (patch: Partial<AddressInput>) => onChange({ ...value, ...patch });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-3 text-sm"
    >
      <FormField label="Label" htmlFor="address-form-label">
        <TextInput
          id="address-form-label"
          required
          value={value.label}
          onChange={(e) => update({ label: e.target.value })}
          data-testid="address-form-label"
        />
      </FormField>
      <FormField label="Full name" htmlFor="address-form-name">
        <TextInput
          id="address-form-name"
          required
          value={value.name}
          onChange={(e) => update({ name: e.target.value })}
          data-testid="address-form-name"
        />
      </FormField>
      <FormField label="Line 1" htmlFor="address-form-line1">
        <TextInput
          id="address-form-line1"
          required
          value={value.line1}
          onChange={(e) => update({ line1: e.target.value })}
          data-testid="address-form-line1"
        />
      </FormField>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <FormField label="City" htmlFor="address-form-city">
            <TextInput
              id="address-form-city"
              required
              value={value.city}
              onChange={(e) => update({ city: e.target.value })}
              data-testid="address-form-city"
            />
          </FormField>
        </div>
        <FormField label="Postal" htmlFor="address-form-postal">
          <TextInput
            id="address-form-postal"
            required
            value={value.postalCode}
            onChange={(e) => update({ postalCode: e.target.value })}
            data-testid="address-form-postal"
          />
        </FormField>
      </div>
      <label className="flex items-center gap-2 text-[13.5px] text-ink-soft">
        <input
          type="checkbox"
          checked={value.isDefault ?? false}
          onChange={(e) => update({ isDefault: e.target.checked })}
          data-testid="address-form-default"
        />
        Set as default
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          data-testid="address-form-cancel"
          className="px-3 py-2 border border-line-strong rounded-lg text-ink hover:bg-paper-deep transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          data-testid="address-form-submit"
          className="px-3 py-2 bg-clay-500 hover:bg-clay-600 text-card rounded-lg font-medium active:scale-95 transition-colors"
        >
          Save
        </button>
      </div>
    </form>
  );
}
