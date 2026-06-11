'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type Product } from '@/lib/api';
import { getRecent } from '@/lib/recently-viewed';
import { useLocale } from '@/lib/i18n';

interface RecentlyViewedProps {
  excludeId?: string | null;
}

export default function RecentlyViewed({ excludeId = null }: RecentlyViewedProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const { formatMoney } = useLocale();

  useEffect(() => {
    const ids = getRecent().filter((id) => id !== excludeId);
    if (ids.length === 0) {
      setProducts([]);
      return;
    }
    let cancelled = false;
    void Promise.all(
      ids.map((id) =>
        api.getProduct(id).catch(() => null), // tolerate deleted products
      ),
    ).then((results) => {
      if (cancelled) return;
      setProducts(results.filter((p): p is Product => p !== null));
    });
    return () => {
      cancelled = true;
    };
  }, [excludeId]);

  if (products.length === 0) return null;

  return (
    <section
      data-testid="recently-viewed"
      className="animate-fade-in space-y-3"
    >
      <h2 className="text-[11.5px] font-semibold text-ink-faint uppercase tracking-[0.06em]">
        Recently viewed
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 snap-x snap-mandatory">
        {products.map((p) => (
          <Link
            key={p.id}
            href={`/products/${p.id}`}
            data-testid={`recently-viewed-item-${p.id}`}
            className="snap-start shrink-0 w-40 bg-card rounded-[10px] overflow-hidden border border-line hover:-translate-y-0.5 hover:shadow-pop transition-all duration-200"
          >
            <div className="h-20 bg-paper-deep" />
            <div className="p-2.5">
              <p className="text-xs font-semibold text-ink truncate">
                {p.name}
              </p>
              <p className="text-xs text-ink-soft mt-0.5 tabular-nums">
                {formatMoney(p.priceCents)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
