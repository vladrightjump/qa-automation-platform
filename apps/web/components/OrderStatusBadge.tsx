import type { OrderStatus } from '@/lib/api';

const COLORS: Record<OrderStatus, string> = {
  PENDING: 'bg-[#f1e6cf] text-accent-500',
  PAID: 'bg-sage-100 text-sage-600',
  FULFILLED: 'bg-clay-100 text-clay-700',
  CANCELLED: 'bg-paper-deep text-ink-faint',
};

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      data-testid="order-status"
      className={`inline-block px-2.5 py-0.5 text-[11px] uppercase tracking-[0.12em] rounded-full font-semibold ${COLORS[status]}`}
    >
      {status}
    </span>
  );
}
