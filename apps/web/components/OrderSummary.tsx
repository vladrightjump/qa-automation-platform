'use client';

import type { Order } from '@/lib/api';
import { useLocale } from '@/lib/i18n';
import OrderStatusBadge from './OrderStatusBadge';

export default function OrderSummary({ order }: { order: Order }) {
  const { t, formatMoney } = useLocale();
  return (
    <div className="bg-card rounded-[10px] border border-line p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[14.5px] font-semibold text-ink">
          Order <span data-testid="order-id">{order.id}</span>
        </h2>
        <OrderStatusBadge status={order.status} />
      </div>
      <p className="text-[12.5px] text-ink-faint">
        {new Date(order.createdAt).toLocaleString()}
      </p>
      <table className="w-full text-[13.5px]">
        <thead className="text-left text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-faint border-b border-line">
          <tr>
            <th className="py-2">{t('cart.item')}</th>
            <th className="py-2">{t('cart.qty')}</th>
            <th className="py-2">{t('cart.subtotal')}</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((i) => (
            <tr key={i.id} className="border-b border-line">
              <td className="py-2 font-mono text-xs text-ink-soft">{i.productId}</td>
              <td className="py-2 tabular-nums text-ink">{i.quantity}</td>
              <td className="py-2 tabular-nums text-ink">{formatMoney(i.unitPriceCents * i.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="rule-clay" />
      <p
        className="text-[15px] font-semibold tabular-nums text-ink flex justify-between"
        data-testid="order-summary-total"
      >
        <span>{t('checkout.total')}</span>
        <span>{formatMoney(order.totalCents)}</span>
      </p>
    </div>
  );
}
