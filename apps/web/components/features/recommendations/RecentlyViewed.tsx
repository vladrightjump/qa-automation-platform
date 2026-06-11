'use client';

import { useEffect, useState } from 'react';
import { api, type Product } from '@/lib/api';
import { getRecent } from '@/lib/recently-viewed';
import { useLocale } from '@/lib/i18n';
import ProductTile from '@/components/features/catalog/ProductTile';
import ProductStrip from './ProductStrip';

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
      ids.map((id) => api.getProduct(id).catch(() => null)),
    ).then((results) => {
      if (cancelled) return;
      setProducts(results.filter((p): p is Product => p !== null));
    });
    return () => {
      cancelled = true;
    };
  }, [excludeId]);

  return (
    <ProductStrip
      testId="recently-viewed"
      title="Recently viewed"
      items={products}
      renderItem={(p) => (
        <ProductTile
          key={p.id}
          href={`/products/${p.id}`}
          name={p.name}
          priceLabel={formatMoney(p.priceCents)}
          thumb={<div className="h-20 bg-paper-deep" />}
          testId={`recently-viewed-item-${p.id}`}
        />
      )}
    />
  );
}
