'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, type Recommendation } from '@/lib/api';
import { getRecent } from '@/lib/recently-viewed';
import { useAuth } from '@/lib/auth';
import { useLocale } from '@/lib/i18n';
import ProductTile from '@/components/features/catalog/ProductTile';
import ProductStrip from './ProductStrip';
import RecentlyViewed from './RecentlyViewed';

interface RecommendationsProps {
  excludeId?: string | null;
}

const KIND_LABEL: Record<Recommendation['kind'], string> = {
  collaborative: 'Bought together',
  'same-category': 'More like your last order',
  'recently-viewed': 'Because you viewed similar',
};

const KIND_ORDER = ['collaborative', 'same-category', 'recently-viewed'] as const;

// Authed: shows up to three labelled rows (one per kind) sourced from
// /recommendations. Unauthed or empty: falls back to <RecentlyViewed> so
// the slot is never blank.
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
    <section data-testid="recommendations" className="animate-fade-in space-y-5">
      {KIND_ORDER.map((kind) => {
        const rows = grouped.get(kind);
        if (!rows || rows.length === 0) return null;
        return (
          <ProductStrip
            key={kind}
            testId={`recommendation-row-${kind}`}
            title={KIND_LABEL[kind]}
            items={rows}
            renderItem={(rec) => (
              <ProductTile
                key={rec.product.id}
                href={`/products/${rec.product.id}`}
                name={rec.product.name}
                priceLabel={formatMoney(rec.product.priceCents)}
                thumb={<div className="h-20 bg-paper-deep" />}
                testId={`recommendation-item-${rec.product.id}`}
              />
            )}
          />
        );
      })}
    </section>
  );
}
