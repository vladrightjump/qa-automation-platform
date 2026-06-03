'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type Product, type ProductCategory } from '@/lib/api';
import { useLocale } from '@/lib/i18n';
import { categoryGradient, initials } from '@/lib/product-visual';

interface RelatedProductsProps {
  productId: string;
  category: ProductCategory;
}

export default function RelatedProducts({ productId, category }: RelatedProductsProps) {
  const [items, setItems] = useState<Product[]>([]);
  const { formatMoney } = useLocale();

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
          const gradient = categoryGradient(p.category);
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
                  {formatMoney(p.priceCents)}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
