'use client';

import { useEffect, useState } from 'react';
import { api, type Product, type ProductCategory } from '@/lib/api';
import { useLocale } from '@/lib/i18n';
import ProductTile from '@/components/features/catalog/ProductTile';
import ProductStrip from './ProductStrip';

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

  return (
    <ProductStrip
      testId="related-products"
      title="You might also like"
      items={items}
      renderItem={(p) => (
        <ProductTile
          key={p.id}
          href={`/products/${p.id}`}
          name={p.name}
          priceLabel={formatMoney(p.priceCents)}
          width="w-44"
          thumb={<div className="h-24 bg-paper-deep" />}
          testId={`related-item-${p.id}`}
        />
      )}
    />
  );
}
