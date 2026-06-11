'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  api,
  type OrderStatus,
  type PagedOrders,
} from '@/lib/api';
import { useRequireAuth } from '@/lib/use-require-auth';
import { useToast } from '@/components/ui/ToastQueue';
import PageHeader from '@/components/ui/PageHeader';
import PageSection from '@/components/ui/PageSection';
import OrdersTable from '@/components/features/admin/OrdersTable';
import ReturnsQueue, {
  type ReturnRow,
} from '@/components/features/admin/ReturnsQueue';

type Filter = 'all' | OrderStatus;

const TABS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'PAID', label: 'Paid' },
  { id: 'FULFILLED', label: 'Fulfilled' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

export default function AdminOrdersPage() {
  const { token, user, isHydrated } = useRequireAuth({ requireAdmin: true });
  const toast = useToast();
  const [data, setData] = useState<PagedOrders | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const reload = useCallback(async () => {
    if (!token) return;
    try {
      const result = await api.adminListOrders(
        token,
        filter === 'all' ? undefined : filter,
      );
      setData(result);
    } catch (e) {
      toast.push({ variant: 'error', message: (e as Error).message });
    }
  }, [token, filter, toast]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function act(label: string, fn: () => Promise<unknown>) {
    if (!token) return;
    try {
      await fn();
      toast.push({ variant: 'success', message: label });
      await reload();
    } catch (e) {
      toast.push({ variant: 'error', message: (e as Error).message });
    }
  }

  // Returns queue: flatten every return across the listed orders.
  const returns = useMemo<ReturnRow[]>(() => {
    if (!data) return [];
    return data.items.flatMap((order) =>
      (order.returns ?? []).map((ret) => ({ ret, order })),
    );
  }, [data]);

  if (!isHydrated || !user || user.role !== 'ADMIN') {
    return <p className="text-ink-faint">Loading…</p>;
  }

  return (
    <PageSection gap={6} testId="admin-orders">
      <PageHeader title="Admin · Orders" />

      <div
        role="tablist"
        data-testid="admin-orders-filter"
        className="flex gap-1 border border-line rounded-lg p-0.5 bg-card w-fit"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={filter === t.id}
            onClick={() => setFilter(t.id)}
            data-testid={`admin-orders-filter-${t.id}`}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              filter === t.id
                ? 'bg-clay-500 text-card'
                : 'text-ink-soft hover:bg-paper-deep'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!data && <p className="text-ink-faint">Loading…</p>}
      {data && (
        <OrdersTable
          rows={data.items}
          onFulfill={(o) =>
            void act(`Fulfilled ${o.id}`, () =>
              api.adminFulfillOrder(token!, o.id),
            )
          }
        />
      )}

      {returns.length > 0 && (
        <ReturnsQueue
          rows={returns}
          onApprove={(r) =>
            void act('Return approved', () =>
              api.adminApproveReturn(token!, r.id),
            )
          }
          onReject={(r) =>
            void act('Return rejected', () =>
              api.adminRejectReturn(token!, r.id),
            )
          }
          onRefund={(r) =>
            void act('Return refunded', () =>
              api.adminRefundReturn(token!, r.id),
            )
          }
        />
      )}
    </PageSection>
  );
}
