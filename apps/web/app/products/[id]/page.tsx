'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, type Product } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import Toast from '@/components/Toast';

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    api
      .getProduct(params.id)
      .then(setProduct)
      .catch((e: Error) => setErr(e.message));
  }, [params.id]);

  if (err) return <Toast message={err} />;
  if (!product) return <p className="text-gray-500">Loading…</p>;
  return (
    <div className="max-w-md">
      <ProductCard product={product} />
    </div>
  );
}
