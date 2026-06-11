import type { OrderStatus } from '@/lib/api';

const COLORS: Record<OrderStatus, string> = {
  PENDING: 'bg-paper-deep text-ink-soft',
  PAID: 'bg-sage-100 text-sage-500',
  FULFILLED: 'bg-sage-100 text-sage-500',
  CANCELLED: 'bg-clay-100 text-clay-700',
};

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      data-testid="order-status"
      className={`inline-block px-2 py-0.5 text-[12px] rounded-md font-semibold ${COLORS[status]}`}
    >
      {status}
    </span>
  );
}
