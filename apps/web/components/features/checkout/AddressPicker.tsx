'use client';

import Link from 'next/link';
import type { Address, AddressInput } from '@/lib/api';
import type { AddressErrors } from '@/lib/validators';
import FormField from '@/components/ui/FormField';
import TextInput from '@/components/ui/TextInput';

interface AddressPickerProps {
  addresses: Address[] | null;
  selectedAddressId: string | null;
  onSelect: (id: string) => void;
  useNewAddress: boolean;
  onToggleNewAddress: (use: boolean) => void;
  newAddress: AddressInput;
  onNewAddressChange: (next: AddressInput) => void;
  errors: AddressErrors;
}

export default function AddressPicker({
  addresses,
  selectedAddressId,
  onSelect,
  useNewAddress,
  onToggleNewAddress,
  newAddress,
  onNewAddressChange,
  errors,
}: AddressPickerProps) {
  const update = (patch: Partial<AddressInput>) =>
    onNewAddressChange({ ...newAddress, ...patch });

  return (
    <div className="space-y-4" data-testid="checkout-step-address-panel">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Shipping address</h2>
        <Link
          href="/account/addresses"
          data-testid="checkout-manage-addresses"
          className="text-sm text-clay-600 hover:underline"
        >
          Manage addresses
        </Link>
      </div>
      {addresses === null && <p className="text-ink-faint">Loading…</p>}
      {addresses !== null && addresses.length > 0 && !useNewAddress && (
        <div className="space-y-2">
          {addresses.map((a) => (
            <label
              key={a.id}
              className="flex items-start gap-3 border border-line-strong rounded-lg p-3 cursor-pointer hover:bg-paper-deep"
              data-testid={`checkout-address-${a.id}`}
            >
              <input
                type="radio"
                name="checkout-address"
                checked={selectedAddressId === a.id}
                onChange={() => onSelect(a.id)}
                className="mt-1"
              />
              <div className="text-sm">
                <div className="font-medium">
                  {a.label}
                  {a.isDefault && (
                    <span className="ml-2 text-xs text-ink-faint">(default)</span>
                  )}
                </div>
                <div>{a.name}</div>
                <div className="text-ink-soft">
                  {a.line1}
                  {a.line2 ? `, ${a.line2}` : ''}, {a.city} {a.postalCode}{' '}
                  {a.country}
                </div>
              </div>
            </label>
          ))}
          <button
            type="button"
            onClick={() => onToggleNewAddress(true)}
            data-testid="checkout-add-new-address"
            className="text-sm text-clay-600 hover:underline"
          >
            + Use a new address
          </button>
        </div>
      )}

      {(useNewAddress || (addresses !== null && addresses.length === 0)) && (
        <form className="space-y-3 border border-line rounded-lg p-4 bg-paper-deep">
          <h3 className="text-sm font-medium">New address</h3>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Label" htmlFor="checkout-new-label">
              <TextInput
                id="checkout-new-label"
                value={newAddress.label}
                onChange={(e) => update({ label: e.target.value })}
                data-testid="checkout-new-label"
              />
            </FormField>
            <FormField
              label="Full name"
              htmlFor="checkout-new-name"
              error={errors.name}
              errorTestId="checkout-new-name-error"
            >
              <TextInput
                id="checkout-new-name"
                value={newAddress.name}
                onChange={(e) => update({ name: e.target.value })}
                invalid={Boolean(errors.name)}
                data-testid="checkout-new-name"
              />
            </FormField>
          </div>
          <FormField
            label="Line 1"
            htmlFor="checkout-new-line1"
            error={errors.line1}
            errorTestId="checkout-new-line1-error"
          >
            <TextInput
              id="checkout-new-line1"
              value={newAddress.line1}
              onChange={(e) => update({ line1: e.target.value })}
              invalid={Boolean(errors.line1)}
              data-testid="checkout-new-line1"
            />
          </FormField>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <FormField
                label="City"
                htmlFor="checkout-new-city"
                error={errors.city}
                errorTestId="checkout-new-city-error"
              >
                <TextInput
                  id="checkout-new-city"
                  value={newAddress.city}
                  onChange={(e) => update({ city: e.target.value })}
                  invalid={Boolean(errors.city)}
                  data-testid="checkout-new-city"
                />
              </FormField>
            </div>
            <FormField
              label="Postal code"
              htmlFor="checkout-new-postal"
              error={errors.postalCode}
              errorTestId="checkout-new-postal-error"
            >
              <TextInput
                id="checkout-new-postal"
                value={newAddress.postalCode}
                onChange={(e) => update({ postalCode: e.target.value })}
                invalid={Boolean(errors.postalCode)}
                data-testid="checkout-new-postal"
              />
            </FormField>
          </div>
          {addresses !== null && addresses.length > 0 && (
            <button
              type="button"
              onClick={() => onToggleNewAddress(false)}
              data-testid="checkout-cancel-new-address"
              className="text-xs text-clay-600 hover:underline"
            >
              Cancel — pick saved
            </button>
          )}
        </form>
      )}
    </div>
  );
}
