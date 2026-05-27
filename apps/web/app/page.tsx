'use client';

import { useEffect, useState } from 'react';
import { api, type Product } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import Toast from '@/components/Toast';

export default function HomePage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api
      .listProducts()
      .then(setProducts)
      .catch((e: Error) => setErr(e.message));
  }, []);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Products</h1>
      {err && <Toast message={err} />}
      {!products && !err && <p className="text-gray-500">Loading…</p>}
      {products && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </section>
  );
}
