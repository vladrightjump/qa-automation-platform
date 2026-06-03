'use client';

import type { Order } from '@/lib/api';
import { useLocale } from '@/lib/i18n';
import OrderStatusBadge from './OrderStatusBadge';

export default function OrderSummary({ order }: { order: Order }) {
  const { t, formatMoney } = useLocale();
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">
          Order <span data-testid="order-id">{order.id}</span>
        </h2>
        <OrderStatusBadge status={order.status} />
      </div>
      <p className="text-xs text-ink-faint">
        {new Date(order.createdAt).toLocaleString()}
      </p>
      <table className="w-full text-sm">
        <thead className="text-left text-ink-soft border-b">
          <tr>
            <th className="py-2">{t('cart.item')}</th>
            <th className="py-2">{t('cart.qty')}</th>
            <th className="py-2">{t('cart.subtotal')}</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((i) => (
            <tr key={i.id} className="border-b">
              <td className="py-2 font-mono text-xs">{i.productId}</td>
              <td className="py-2">{i.quantity}</td>
              <td className="py-2">{formatMoney(i.unitPriceCents * i.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="font-semibold" data-testid="order-summary-total">
        {t('checkout.total')}: {formatMoney(order.totalCents)}
      </p>
    </div>
  );
}
