'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api, type Recommendation } from '@/lib/api';
import { getRecent } from '@/lib/recently-viewed';
import { useAuth } from '@/lib/auth';
import { useLocale } from '@/lib/i18n';
import { categoryGradient, initials } from '@/lib/product-visual';
import RecentlyViewed from './RecentlyViewed';

interface RecommendationsProps {
  excludeId?: string | null;
}

const KIND_LABEL: Record<Recommendation['kind'], string> = {
  collaborative: 'Bought together',
  'same-category': 'More like your last order',
  'recently-viewed': 'Because you viewed similar',
};

// Authed: shows up to three labelled rows (one per kind) sourced from
// /recommendations. Unauthed or empty: falls back to the existing
// <RecentlyViewed> strip so the slot is never blank.
export default function Recommendations({ excludeId = null }: RecommendationsProps) {
  const { token } = useAuth();
  const [recs, setRecs] = useState<Recommendation[] | null>(null);
  const { formatMoney } = useLocale();

  useEffect(() => {
    if (!token) {
      setRecs(null);
      return;
    }
    let cancelled = false;
    const recent = getRecent();
    void api
      .getRecommendations(token, recent)
      .then((items) => {
        if (cancelled) return;
        setRecs(items.filter((r) => r.product.id !== excludeId));
      })
      .catch(() => {
        if (!cancelled) setRecs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [token, excludeId]);

  const grouped = useMemo(() => {
    if (!recs) return null;
    const byKind = new Map<Recommendation['kind'], Recommendation[]>();
    for (const rec of recs) {
      const arr = byKind.get(rec.kind) ?? [];
      arr.push(rec);
      byKind.set(rec.kind, arr);
    }
    return byKind;
  }, [recs]);

  if (!token) return <RecentlyViewed excludeId={excludeId} />;
  if (!grouped || grouped.size === 0) return <RecentlyViewed excludeId={excludeId} />;

  return (
    <section
      data-testid="recommendations"
      className="animate-fade-in space-y-5"
    >
      {(['collaborative', 'same-category', 'recently-viewed'] as const).map((kind) => {
        const rows = grouped.get(kind);
        if (!rows || rows.length === 0) return null;
        return (
          <div
            key={kind}
            data-testid={`recommendation-row-${kind}`}
            className="space-y-3"
          >
            <h2 className="text-sm font-medium text-ink-soft uppercase tracking-wider">
              {KIND_LABEL[kind]}
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 snap-x snap-mandatory">
              {rows.map((rec) => {
                const p = rec.product;
                const gradient = categoryGradient(p.category);
                return (
                  <Link
                    key={p.id}
                    href={`/products/${p.id}`}
                    data-testid={`recommendation-item-${p.id}`}
                    title={rec.reason}
                    className="snap-start shrink-0 w-40 bg-card rounded-2xl overflow-hidden border border-line shadow-card hover:-translate-y-0.5 hover:shadow-pop transition-all duration-200"
                  >
                    <div
                      className={`h-20 bg-gradient-to-br ${gradient} flex items-center justify-center text-card font-bold`}
                    >
                      {initials(p.name)}
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-medium text-ink truncate">
                        {p.name}
                      </p>
                      <p className="text-xs text-ink-soft mt-0.5">
                        {formatMoney(p.priceCents)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
