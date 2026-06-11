'use client';

import Link from 'next/link';
import type { Order } from '@/lib/api';
import OrderStatusBadge from './OrderStatusBadge';

interface OrderCardProps {
  order: Order;
}

export default function OrderCard({ order }: OrderCardProps) {
  return (
    <li
      data-testid={`orders-row-${order.id}`}
      className="animate-fade-in border border-line rounded-[10px] px-5 py-3.5 flex justify-between items-center bg-card hover:bg-paper-deep transition-colors duration-150"
    >
      <Link
        href={`/orders/${order.id}`}
        className="font-mono text-[14.5px] font-semibold text-ink hover:text-clay-600 transition-colors"
      >
        {order.id}
      </Link>
      <OrderStatusBadge status={order.status} />
    </li>
  );
}
