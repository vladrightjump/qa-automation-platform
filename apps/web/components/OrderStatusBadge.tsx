import type { OrderStatus } from '@/lib/api';

const COLORS: Record<OrderStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PAID: 'bg-green-100 text-green-800',
  FULFILLED: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-gray-200 text-gray-700',
};

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      data-testid="order-status"
      className={`inline-block px-2 py-0.5 text-xs rounded font-medium ${COLORS[status]}`}
    >
      {status}
    </span>
  );
}
