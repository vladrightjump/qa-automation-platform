import type { OrderStatus } from '@/lib/api';
import StatusChip, { type StatusTone } from '@/components/ui/StatusChip';

const TONE: Record<OrderStatus, StatusTone> = {
  PENDING: 'neutral',
  PAID: 'success',
  FULFILLED: 'success',
  CANCELLED: 'warning',
};

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <StatusChip tone={TONE[status]} testId="order-status">
      {status}
    </StatusChip>
  );
}
