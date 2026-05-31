'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  api,
  type Order,
  type OrderReturn,
  type OrderStatus,
  type PagedOrders,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/ToastQueue';
import OrderStatusBadge from '@/components/OrderStatusBadge';

type Filter = 'all' | OrderStatus;

const TABS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'PAID', label: 'Paid' },
  { id: 'FULFILLED', label: 'Fulfilled' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

export default function AdminOrdersPage() {
  const { token, user, isHydrated } = useAuth();
  const toast = useToast();
  const [data, setData] = useState<PagedOrders | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    if (!isHydrated) return;
    if (!token) {
      window.location.replace('/login');
      return;
    }
    if (user && user.role !== 'ADMIN') {
      window.location.replace('/');
    }
  }, [isHydrated, token, user]);

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
  const returns = useMemo<{ ret: OrderReturn; order: Order }[]>(() => {
    if (!data) return [];
    return data.items.flatMap((order) =>
      (order.returns ?? []).map((ret) => ({ ret, order })),
    );
  }, [data]);

  if (!isHydrated || !user || user.role !== 'ADMIN') {
    return <p className="text-ink-faint">Loading…</p>;
  }

  return (
    <section className="space-y-6" data-testid="admin-orders">
      <h1 className="text-2xl font-semibold">Admin · Orders</h1>

      <div
        role="tablist"
        data-testid="admin-orders-filter"
        className="flex gap-1 border border-line rounded-full p-0.5 bg-card w-fit"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={filter === t.id}
            onClick={() => setFilter(t.id)}
            data-testid={`admin-orders-filter-${t.id}`}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
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
        <table className="w-full text-sm border bg-card rounded">
          <thead className="bg-paper-deep text-left">
            <tr>
              <th className="p-2">Order</th>
              <th className="p-2">Status</th>
              <th className="p-2 text-right">Total</th>
              <th className="p-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((o) => (
              <tr
                key={o.id}
                data-testid={`admin-order-row-${o.id}`}
                className="border-t"
              >
                <td className="p-2 font-mono text-xs">{o.id}</td>
                <td className="p-2">
                  <OrderStatusBadge status={o.status} />
                </td>
                <td className="p-2 text-right">
                  ${(o.totalCents / 100).toFixed(2)}
                </td>
                <td className="p-2 text-right">
                  {o.status === 'PAID' && (
                    <button
                      onClick={() =>
                        void act(`Fulfilled ${o.id}`, () =>
                          api.adminFulfillOrder(token!, o.id),
                        )
                      }
                      data-testid={`admin-order-fulfill-${o.id}`}
                      className="text-clay-600 hover:underline"
                    >
                      Fulfill
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {returns.length > 0 && (
        <div className="space-y-2" data-testid="admin-returns">
          <h2 className="text-lg font-semibold">Returns queue</h2>
          <table className="w-full text-sm border bg-card rounded">
            <thead className="bg-paper-deep text-left">
              <tr>
                <th className="p-2">Order</th>
                <th className="p-2">Reason</th>
                <th className="p-2">Status</th>
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {returns.map(({ ret }) => (
                <tr
                  key={ret.id}
                  data-testid={`admin-return-row-${ret.id}`}
                  className="border-t"
                >
                  <td className="p-2 font-mono text-xs">{ret.orderId}</td>
                  <td className="p-2">{ret.reason}</td>
                  <td
                    className="p-2 font-medium"
                    data-testid={`admin-return-status-${ret.id}`}
                  >
                    {ret.status}
                  </td>
                  <td className="p-2 text-right space-x-2">
                    {ret.status === 'REQUESTED' && (
                      <>
                        <button
                          onClick={() =>
                            void act('Return approved', () =>
                              api.adminApproveReturn(token!, ret.id),
                            )
                          }
                          data-testid={`admin-return-approve-${ret.id}`}
                          className="text-green-600 hover:underline"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() =>
                            void act('Return rejected', () =>
                              api.adminRejectReturn(token!, ret.id),
                            )
                          }
                          data-testid={`admin-return-reject-${ret.id}`}
                          className="text-red-600 hover:underline"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {ret.status === 'APPROVED' && (
                      <button
                        onClick={() =>
                          void act('Return refunded', () =>
                            api.adminRefundReturn(token!, ret.id),
                          )
                        }
                        data-testid={`admin-return-refund-${ret.id}`}
                        className="text-clay-600 hover:underline"
                      >
                        Refund
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
