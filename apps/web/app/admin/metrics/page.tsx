'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, type SalesMetrics } from '@/lib/api';
import { useRequireAuth } from '@/lib/use-require-auth';
import { useLocale } from '@/lib/i18n';
import { useToast } from '@/components/ui/ToastQueue';
import PageHeader from '@/components/ui/PageHeader';
import PageSection from '@/components/ui/PageSection';
import MetricCard from '@/components/features/admin/MetricCard';

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from: toIsoDate(from), to: toIsoDate(to) };
}

export default function AdminMetricsPage() {
  const { token, user, isHydrated } = useRequireAuth({ requireAdmin: true });
  const toast = useToast();
  const { formatMoney } = useLocale();

  const init = defaultRange();
  const [from, setFrom] = useState<string>(init.from);
  const [to, setTo] = useState<string>(init.to);
  const [metrics, setMetrics] = useState<SalesMetrics | null>(null);
  const [cacheState, setCacheState] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchMetrics = useCallback(
    async (rangeFrom: string, rangeTo: string) => {
      if (!token) return;
      setLoading(true);
      try {
        const fromIso = `${rangeFrom}T00:00:00.000Z`;
        const toIso = `${rangeTo}T23:59:59.999Z`;
        const { data, cacheState: cs } = await api.adminGetSalesMetricsWithCache(
          token,
          fromIso,
          toIso,
        );
        setMetrics(data);
        setCacheState(cs);
      } catch (e) {
        toast.push({ variant: 'error', message: (e as Error).message });
      } finally {
        setLoading(false);
      }
    },
    [token, toast],
  );

  useEffect(() => {
    // Intentionally re-fetch only when the auth token resolves; the default
    // range is captured at mount via `init` above.
    void fetchMetrics(init.from, init.to);
  }, [token, fetchMetrics, init.from, init.to]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    void fetchMetrics(from, to);
  }

  if (!isHydrated || !user || user.role !== 'ADMIN') {
    return <p className="text-ink-faint">Loading…</p>;
  }

  return (
    <PageSection gap={6} testId="admin-metrics">
      <PageHeader
        title="Admin · Sales metrics"
        action={
          cacheState && (
            <span
              data-testid="cache-state-chip"
              data-cache-state={cacheState}
              className="text-xs font-mono px-2 py-0.5 rounded-md border border-line bg-paper-deep text-ink-soft uppercase"
            >
              X-Cache: {cacheState}
            </span>
          )
        }
      />

      <form
        onSubmit={submit}
        className="flex flex-wrap items-end gap-3 bg-card border border-line rounded-[10px] p-5"
      >
        <label className="text-sm">
          <span className="block text-ink-soft mb-1">From</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            data-testid="metrics-from"
            className="bg-card border border-line-strong rounded-lg px-3 py-2 text-sm outline-none focus:border-clay-500 transition-colors"
          />
        </label>
        <label className="text-sm">
          <span className="block text-ink-soft mb-1">To</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            data-testid="metrics-to"
            className="bg-card border border-line-strong rounded-lg px-3 py-2 text-sm outline-none focus:border-clay-500 transition-colors"
          />
        </label>
        <button
          type="submit"
          data-testid="metrics-submit"
          disabled={loading}
          className="px-3 py-2 bg-clay-500 hover:bg-clay-600 text-card text-sm rounded-lg font-medium active:scale-95 disabled:opacity-60 disabled:active:scale-100 transition-colors"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </form>

      {metrics && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard
              testId="metric-card-revenue"
              label="Total revenue"
              value={formatMoney(metrics.totalRevenueCents)}
            />
            <MetricCard
              testId="metric-card-orders"
              label="Orders"
              value={String(metrics.orderCount)}
            />
            <MetricCard
              testId="metric-card-aov"
              label="Average order value"
              value={formatMoney(metrics.averageOrderValueCents)}
            />
          </div>

          <div className="bg-card border border-line rounded-[10px] overflow-hidden">
            <h2 className="text-[11.5px] font-semibold px-5 py-3 border-b border-line text-ink-faint uppercase tracking-[0.06em]">
              Top products
            </h2>
            <table className="w-full text-sm" data-testid="metrics-top-products">
              <thead className="bg-paper-deep text-left text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
                <tr>
                  <th className="p-2">Product</th>
                  <th className="p-2 text-right">Units sold</th>
                  <th className="p-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {metrics.topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-3 text-ink-faint text-center">
                      No paid orders in this range.
                    </td>
                  </tr>
                ) : (
                  metrics.topProducts.map((p) => (
                    <tr
                      key={p.productId}
                      data-testid={`metrics-top-${p.productId}`}
                      className="border-t border-line"
                    >
                      <td className="p-2">
                        <span className="font-mono text-xs text-ink-faint mr-2">
                          {p.productId}
                        </span>
                        {p.name}
                      </td>
                      <td className="p-2 text-right">{p.unitsSold}</td>
                      <td className="p-2 text-right">
                        {formatMoney(p.revenueCents)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-card border border-line rounded-[10px] overflow-hidden">
            <h2 className="text-[11.5px] font-semibold px-5 py-3 border-b border-line text-ink-faint uppercase tracking-[0.06em]">
              By category
            </h2>
            <table className="w-full text-sm" data-testid="metrics-by-category">
              <thead className="bg-paper-deep text-left text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
                <tr>
                  <th className="p-2">Category</th>
                  <th className="p-2 text-right">Orders</th>
                  <th className="p-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {metrics.byCategory.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-3 text-ink-faint text-center">
                      —
                    </td>
                  </tr>
                ) : (
                  metrics.byCategory.map((c) => (
                    <tr
                      key={c.category}
                      data-testid={`metrics-cat-${c.category}`}
                      className="border-t border-line"
                    >
                      <td className="p-2 capitalize">{c.category}</td>
                      <td className="p-2 text-right">{c.orderCount}</td>
                      <td className="p-2 text-right">
                        {formatMoney(c.revenueCents)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </PageSection>
  );
}
