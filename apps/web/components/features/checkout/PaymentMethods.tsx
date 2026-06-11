'use client';

import type { PaymentMethod } from '@/lib/api';
import TextInput from '@/components/ui/TextInput';

const METHODS: PaymentMethod[] = ['CARD', 'PAYPAL', 'COD'];

const LABEL: Record<PaymentMethod, string> = {
  CARD: 'CARD',
  PAYPAL: 'PAYPAL',
  COD: 'Cash on delivery',
};

interface PaymentMethodsProps {
  value: PaymentMethod;
  onChange: (m: PaymentMethod) => void;
}

export default function PaymentMethods({ value, onChange }: PaymentMethodsProps) {
  return (
    <div className="space-y-3" data-testid="checkout-step-payment-panel">
      <h2 className="font-medium">Payment method</h2>
      {METHODS.map((m) => (
        <label
          key={m}
          className="flex items-center gap-2 border border-line-strong rounded-lg p-3 cursor-pointer hover:bg-paper-deep"
          data-testid={`checkout-payment-${m}`}
        >
          <input
            type="radio"
            name="payment"
            checked={value === m}
            onChange={() => onChange(m)}
          />
          <span>{LABEL[m]}</span>
        </label>
      ))}
      {value === 'CARD' && (
        <div
          data-testid="checkout-card-fields"
          className="border border-line rounded-lg p-4 bg-paper-deep text-sm space-y-2"
        >
          <p className="text-ink-faint">Card details (not stored)</p>
          <TextInput placeholder="Card number" data-testid="checkout-card-number" />
          <div className="grid grid-cols-2 gap-2">
            <TextInput placeholder="MM/YY" data-testid="checkout-card-expiry" />
            <TextInput placeholder="CVC" data-testid="checkout-card-cvc" />
          </div>
        </div>
      )}
    </div>
  );
}
