'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api, type Order, type OrderStatus } from '@/lib/api';
import { useRequireAuth } from '@/lib/use-require-auth';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import EmptyOrders from '@/components/illustrations/EmptyOrders';

type Filter = 'all' | OrderStatus;

const TABS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'PAID', label: 'Paid' },
  { id: 'FULFILLED', label: 'Fulfilled' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

export default function OrdersPage() {
  const { token } = useRequireAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!token) return;
    api.listOrders(token).then(setOrders);
  }, [token]);

  const visible = useMemo(() => {
    if (!orders) return null;
    return orders.filter((o) => {
      if (filter !== 'all' && o.status !== filter) return false;
      if (search.trim() && !o.id.includes(search.trim())) return false;
      return true;
    });
  }, [orders, filter, search]);

  if (!orders) {
    return (
      <section className="space-y-4">
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink">
          Your orders
        </h1>
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="block" className="h-16" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5" data-testid="orders-page">
      <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink">
        Your orders
      </h1>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div
          role="tablist"
          data-testid="orders-filter-tabs"
          className="flex gap-1 border border-line rounded-lg p-0.5 bg-card"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={filter === t.id}
              onClick={() => setFilter(t.id)}
              data-testid={`orders-filter-${t.id}`}
              className={`px-3 py-1 text-sm rounded-md transition-colors duration-150 ${
                filter === t.id
                  ? 'bg-ink text-card'
                  : 'text-ink-soft hover:bg-paper-deep'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search order id…"
          data-testid="orders-search"
          className="bg-card border border-line-strong rounded-lg px-3.5 py-2 text-sm placeholder:text-ink-faint outline-none focus:border-clay-500 transition-colors"
        />
      </div>

      {visible && visible.length === 0 && (
        <EmptyState
          testId="orders-empty"
          icon={<EmptyOrders />}
          title={
            orders.length === 0 ? 'No orders yet' : 'No matching orders'
          }
          description={
            orders.length === 0
              ? 'Once you place an order it shows up here with a status timeline.'
              : 'Try a different filter or clear the search.'
          }
          action={
            orders.length === 0 ? (
              <Link
                href="/"
                className="inline-flex items-center bg-clay-500 hover:bg-clay-600 text-card text-sm font-medium px-4 py-2 rounded-lg transition-colors active:scale-95"
              >
                Browse products
              </Link>
            ) : null
          }
        />
      )}
      {visible && visible.length > 0 && (
        <ul className="space-y-2">
          {visible.map((o) => (
            <li
              key={o.id}
              data-testid={`orders-row-${o.id}`}
              className="animate-fade-in border border-line rounded-[10px] px-5 py-3.5 flex justify-between items-center bg-card hover:bg-paper-deep transition-colors duration-150"
            >
              <Link
                href={`/orders/${o.id}`}
                className="font-mono text-[14.5px] font-semibold text-ink hover:text-clay-600 transition-colors"
              >
                {o.id}
              </Link>
              <OrderStatusBadge status={o.status} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
