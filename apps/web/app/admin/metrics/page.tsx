'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, type SalesMetrics } from '@/lib/api';
import { useRequireAuth } from '@/lib/use-require-auth';
import { useLocale } from '@/lib/i18n';
import { useToast } from '@/components/ui/ToastQueue';

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
    <section className="space-y-6" data-testid="admin-metrics">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink">Admin · Sales metrics</h1>
        {/* Debug chip — surfaces the X-Cache header from the last
            response so reviewers (and visual specs) can see the cache
            state without devtools. The SUT is a test target, so this is
            always rendered when a value is available. */}
        {cacheState && (
          <span
            data-testid="cache-state-chip"
            data-cache-state={cacheState}
            className="text-xs font-mono px-2 py-0.5 rounded-md border border-line bg-paper-deep text-ink-soft uppercase"
          >
            X-Cache: {cacheState}
          </span>
        )}
      </div>

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
            <Card
              testId="metric-card-revenue"
              label="Total revenue"
              value={formatMoney(metrics.totalRevenueCents)}
            />
            <Card
              testId="metric-card-orders"
              label="Orders"
              value={String(metrics.orderCount)}
            />
            <Card
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
    </section>
  );
}

interface CardProps {
  testId: string;
  label: string;
  value: string;
}

function Card({ testId, label, value }: CardProps) {
  return (
    <div
      data-testid={testId}
      className="bg-card border border-line rounded-[10px] p-5"
    >
      <p className="text-[12.5px] text-ink-soft">{label}</p>
      <p className="mt-1 text-[22px] font-semibold tabular-nums text-ink">{value}</p>
    </div>
  );
}
