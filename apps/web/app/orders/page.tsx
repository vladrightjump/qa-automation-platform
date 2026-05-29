'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, type Order, type OrderStatus } from '@/lib/api';
import { useAuth } from '@/lib/auth';
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

  if (!orders) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
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
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">
        Your orders
      </h1>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div
          role="tablist"
          data-testid="orders-filter-tabs"
          className="flex gap-1 border border-gray-200 rounded-full p-0.5 bg-white shadow-sm"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={filter === t.id}
              onClick={() => setFilter(t.id)}
              data-testid={`orders-filter-${t.id}`}
              className={`px-3 py-1 text-sm rounded-full transition-all duration-150 ${
                filter === t.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
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
          className="border border-gray-200 rounded-full px-3 py-1.5 text-sm bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-shadow"
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
                className="inline-flex items-center bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-full transition-colors active:scale-95"
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
              className="animate-fade-in border border-gray-100 rounded-2xl px-4 py-3 flex justify-between items-center bg-white shadow-card hover:shadow-pop hover:-translate-y-0.5 transition-all duration-200"
            >
              <Link
                href={`/orders/${o.id}`}
                className="font-mono text-sm text-gray-700 hover:text-brand-700 transition-colors"
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
