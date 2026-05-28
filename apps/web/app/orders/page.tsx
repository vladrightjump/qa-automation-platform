'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, type Order, type OrderStatus } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import OrderStatusBadge from '@/components/OrderStatusBadge';

type Filter = 'all' | OrderStatus;

const TABS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'PAID', label: 'Paid' },
  { id: 'FULFILLED', label: 'Fulfilled' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

export default function OrdersPage() {
  const router = useRouter();
  const { token, isHydrated } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isHydrated) return;
    if (!token) {
      router.push('/login');
      return;
    }
    api.listOrders(token).then(setOrders);
  }, [isHydrated, token, router]);

  const visible = useMemo(() => {
    if (!orders) return null;
    return orders.filter((o) => {
      if (filter !== 'all' && o.status !== filter) return false;
      if (search.trim() && !o.id.includes(search.trim())) return false;
      return true;
    });
  }, [orders, filter, search]);

  if (!orders) return <p className="text-gray-500">Loading…</p>;

  return (
    <section className="space-y-3" data-testid="orders-page">
      <h1 className="text-2xl font-semibold">Your orders</h1>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div
          role="tablist"
          data-testid="orders-filter-tabs"
          className="flex gap-1 border rounded-md p-0.5 bg-gray-100"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={filter === t.id}
              onClick={() => setFilter(t.id)}
              data-testid={`orders-filter-${t.id}`}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                filter === t.id
                  ? 'bg-white shadow text-gray-900'
                  : 'text-gray-600'
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
          className="border rounded px-2 py-1 text-sm"
        />
      </div>

      {visible && visible.length === 0 && (
        <p data-testid="orders-empty" className="text-gray-600">
          {orders.length === 0
            ? 'No orders yet.'
            : 'No orders match those filters.'}
        </p>
      )}
      {visible && visible.length > 0 && (
        <ul className="space-y-2">
          {visible.map((o) => (
            <li
              key={o.id}
              data-testid={`orders-row-${o.id}`}
              className="border rounded p-3 flex justify-between items-center bg-white"
            >
              <Link href={`/orders/${o.id}`} className="font-mono text-sm">
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
