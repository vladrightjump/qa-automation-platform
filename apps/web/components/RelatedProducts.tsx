'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type Product, type ProductCategory } from '@/lib/api';

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

interface RelatedProductsProps {
  productId: string;
  category: ProductCategory;
}

export default function RelatedProducts({ productId, category }: RelatedProductsProps) {
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    let cancelled = false;
    void api
      .listProducts({ category: [category], pageSize: 8 })
      .then((res) => {
        if (cancelled) return;
        setItems(res.items.filter((p) => p.id !== productId).slice(0, 6));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [productId, category]);

  if (items.length === 0) return null;

  return (
    <section
      data-testid="related-products"
      className="animate-fade-in space-y-3"
    >
      <h2 className="text-sm font-medium text-ink-soft uppercase tracking-wider">
        You might also like
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 snap-x snap-mandatory">
        {items.map((p) => {
          const gradient =
            CATEGORY_HUE[p.category] ?? 'from-clay-200 to-clay-500';
          return (
            <Link
              key={p.id}
              href={`/products/${p.id}`}
              data-testid={`related-item-${p.id}`}
              className="snap-start shrink-0 w-44 bg-card rounded-2xl overflow-hidden border border-line shadow-card hover:-translate-y-0.5 hover:shadow-pop transition-all duration-200"
            >
              <div
                className={`h-24 bg-gradient-to-br ${gradient} flex items-center justify-center text-card text-xl font-bold`}
              >
                {initials(p.name)}
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-ink truncate">
                  {p.name}
                </p>
                <p className="text-sm text-ink-soft mt-0.5">
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
