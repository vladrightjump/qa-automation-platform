'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, type Product } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/ToastQueue';

export default function ProductCard({
  product,
  onAdded,
}: {
  product: Product;
  onAdded?: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const { token, refreshCartCount } = useAuth();
  const [busy, setBusy] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void api.getWishlist(token).then((w) => {
      if (cancelled) return;
      setInWishlist(w.items.some((i) => i.productId === product.id));
    });
    return () => {
      cancelled = true;
    };
  }, [token, product.id]);

  async function toggleWishlist() {
    if (!token) {
      router.push('/login');
      return;
    }
    const previous = inWishlist;
    setInWishlist(!previous); // optimistic
    try {
      if (previous) {
        await api.removeFromWishlist(token, product.id);
      } else {
        await api.addToWishlist(token, product.id);
      }
    } catch (e) {
      setInWishlist(previous); // rollback
      toast.push({
        variant: 'error',
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  async function handleAdd() {
    if (!token) {
      router.push('/login');
      return;
    }
    setBusy(true);
    try {
      await api.addToCart(token, product.id, 1);
      await refreshCartCount();
      onAdded?.();
    } finally {
      setBusy(false);
    }
  }

  const oos = product.stock === 0;
  return (
    <article
      data-testid={`product-card-${product.id}`}
      className="border rounded-md p-4 bg-white flex flex-col gap-2 relative"
    >
      <button
        type="button"
        onClick={toggleWishlist}
        data-testid={`wishlist-toggle-${product.id}`}
        aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        aria-pressed={inWishlist}
        className={`absolute top-3 right-3 text-lg ${inWishlist ? 'text-red-500' : 'text-gray-300 hover:text-gray-400'}`}
      >
        {inWishlist ? '♥' : '♡'}
      </button>
      <Link href={`/products/${product.id}`} className="text-gray-900 pr-6">
        <h3 className="font-medium">{product.name}</h3>
      </Link>
      <p className="text-sm text-gray-600">{product.description}</p>
      <p className="font-mono text-sm">
        ${(product.priceCents / 100).toFixed(2)}
      </p>
      <div className="flex items-center gap-2 text-xs">
        <span
          data-testid={`product-category-${product.id}`}
          className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-700 capitalize"
        >
          {product.category}
        </span>
        <span className="text-gray-500">Stock: {product.stock}</span>
      </div>
      {product.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {product.tags.map((t) => (
            <span
              key={t}
              data-testid={`product-tag-${product.id}-${t}`}
              className="text-[10px] uppercase tracking-wide text-gray-500"
            >
              #{t}
            </span>
          ))}
        </div>
      )}
      <button
        onClick={handleAdd}
        disabled={busy || oos}
        data-testid={`add-to-cart-${product.id}`}
        className="mt-auto px-3 py-1.5 bg-blue-600 text-white text-sm rounded disabled:bg-gray-300"
      >
        {oos ? 'Out of stock' : busy ? 'Adding…' : 'Add to cart'}
      </button>
    </article>
  );
}
