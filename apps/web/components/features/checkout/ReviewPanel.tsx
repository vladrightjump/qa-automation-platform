'use client';

import type { Cart } from '@/lib/api';
import { useLocale } from '@/lib/i18n';

interface ReviewPanelProps {
  cart: Cart | null;
}

export default function ReviewPanel({ cart }: ReviewPanelProps) {
  const { formatMoney } = useLocale();
  if (!cart) return null;
  return (
    <ul className="border border-line rounded-lg divide-y divide-line bg-card">
      {cart.items.map((i) => (
        <li
          key={i.id}
          className="p-2 flex justify-between text-sm"
          data-testid={`review-line-${i.productId}`}
        >
          <span>
            {i.product.name} × {i.quantity}
          </span>
          <span className="font-mono">
            {formatMoney(i.product.priceCents * i.quantity)}
          </span>
        </li>
      ))}
    </ul>
  );
}
