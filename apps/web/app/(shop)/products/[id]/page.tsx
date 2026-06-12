'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, type Product } from '@/lib/api';
import ProductCard from '@/components/features/catalog/ProductCard';
import Toast from '@/components/ui/Toast';
import Skeleton from '@/components/ui/Skeleton';

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const productId = params.id;
  const [product, setProduct] = useState<Product | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) return;
    api
      .getProduct(productId)
      .then(setProduct)
      .catch((e: Error) => setErr(e.message));
  }, [productId]);

  if (err) return <Toast message={err} />;
  if (!product) {
    return (
      <div className="max-w-2xl space-y-4">
        <div className="bg-card rounded-[10px] border border-line overflow-hidden">
          <Skeleton variant="block" className="h-36 rounded-none" />
          <div className="p-4 space-y-3">
            <Skeleton variant="line" width="60%" />
            <Skeleton variant="line" width="40%" />
            <Skeleton variant="line" width="80%" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      <ProductCard product={product} />
      <section
        data-testid="product-description"
        className="border border-line rounded-[10px] bg-card p-5 space-y-2"
      >
        <h2 className="text-sm font-semibold text-ink">Description</h2>
        <p className="text-sm text-ink-soft leading-relaxed">
          {product.description ?? 'No description.'}
        </p>
      </section>
      <section
        data-testid="product-specs"
        className="border border-line rounded-[10px] bg-card p-5"
      >
        <h2 className="text-sm font-semibold text-ink mb-2">Specs</h2>
        <dl className="text-sm grid grid-cols-2 gap-y-1">
          <dt className="text-ink-faint">ID</dt>
          <dd className="font-mono">{product.id}</dd>
          <dt className="text-ink-faint">Category</dt>
          <dd className="capitalize">{product.category}</dd>
          <dt className="text-ink-faint">Stock</dt>
          <dd data-testid="product-stock">{product.stock}</dd>
          <dt className="text-ink-faint">Tags</dt>
          <dd>{product.tags.join(', ') || '—'}</dd>
        </dl>
      </section>
    </div>
  );
}
