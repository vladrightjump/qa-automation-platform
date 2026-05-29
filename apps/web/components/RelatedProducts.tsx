'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type Product, type ProductCategory } from '@/lib/api';

const CATEGORY_HUE: Record<string, string> = {
  gadgets: 'from-violet-400 to-fuchsia-400',
  apparel: 'from-pink-400 to-rose-400',
  home: 'from-amber-300 to-orange-400',
  office: 'from-sky-400 to-blue-500',
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
      <h2 className="text-sm font-medium text-gray-700 uppercase tracking-wider">
        You might also like
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 snap-x snap-mandatory">
        {items.map((p) => {
          const gradient =
            CATEGORY_HUE[p.category] ?? 'from-gray-300 to-gray-400';
          return (
            <Link
              key={p.id}
              href={`/products/${p.id}`}
              data-testid={`related-item-${p.id}`}
              className="snap-start shrink-0 w-44 bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-card hover:-translate-y-0.5 hover:shadow-pop transition-all duration-200"
            >
              <div
                className={`h-24 bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-xl font-bold`}
              >
                {initials(p.name)}
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {p.name}
                </p>
                <p className="text-sm text-gray-700 mt-0.5">
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
