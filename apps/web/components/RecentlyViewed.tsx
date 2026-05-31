'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type Product } from '@/lib/api';
import { getRecent } from '@/lib/recently-viewed';

const CATEGORY_HUE: Record<string, string> = {
  gadgets: 'from-[#e3c0aa] to-[#b25c3c]',
  apparel: 'from-[#e8c8bf] to-[#b56a59]',
  home: 'from-[#d9dcc4] to-[#6e7256]',
  office: 'from-[#e9d7a6] to-[#b8862f]',
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

interface RecentlyViewedProps {
  excludeId?: string | null;
}

export default function RecentlyViewed({ excludeId = null }: RecentlyViewedProps) {
  const [products, setProducts] = useState<Product[]>([]);

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
      <h2 className="text-sm font-medium text-ink-soft uppercase tracking-wider">
        Recently viewed
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 snap-x snap-mandatory">
        {products.map((p) => {
          const gradient =
            CATEGORY_HUE[p.category] ?? 'from-clay-200 to-clay-500';
          return (
            <Link
              key={p.id}
              href={`/products/${p.id}`}
              data-testid={`recently-viewed-item-${p.id}`}
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
                  ${(p.priceCents / 100).toFixed(2)}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
