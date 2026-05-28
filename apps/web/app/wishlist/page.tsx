'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, type Wishlist } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/ToastQueue';

export default function WishlistPage() {
  const router = useRouter();
  const toast = useToast();
  const { token, isHydrated, refreshCartCount } = useAuth();
  const [wishlist, setWishlist] = useState<Wishlist | null>(null);

  const reload = useCallback(async () => {
    if (!token) return;
    try {
      setWishlist(await api.getWishlist(token));
    } catch (e) {
      toast.push({ variant: 'error', message: (e as Error).message });
    }
  }, [token, toast]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!token) {
      router.replace('/login');
      return;
    }
    void reload();
  }, [isHydrated, token, router, reload]);

  async function remove(productId: string) {
    if (!token) return;
    try {
      const next = await api.removeFromWishlist(token, productId);
      setWishlist(next);
    } catch (e) {
      toast.push({ variant: 'error', message: (e as Error).message });
    }
  }

  async function moveToCart(productId: string) {
    if (!token) return;
    try {
      await api.addToCart(token, productId, 1);
      const next = await api.removeFromWishlist(token, productId);
      setWishlist(next);
      await refreshCartCount();
      toast.push({ variant: 'success', message: 'Moved to cart' });
    } catch (e) {
      toast.push({ variant: 'error', message: (e as Error).message });
    }
  }

  if (!isHydrated || !token) return <p className="text-gray-500">Loading…</p>;

  return (
    <section className="space-y-4" data-testid="wishlist-page">
      <h1 className="text-2xl font-semibold">Wishlist</h1>
      {!wishlist && <p className="text-gray-500">Loading…</p>}
      {wishlist && wishlist.items.length === 0 && (
        <div
          data-testid="wishlist-empty"
          className="border rounded p-6 bg-white text-center text-gray-600"
        >
          <p>Your wishlist is empty.</p>
          <Link href="/" className="text-blue-600 hover:underline">
            Browse products
          </Link>
        </div>
      )}
      {wishlist && wishlist.items.length > 0 && (
        <ul className="space-y-2">
          {wishlist.items.map((i) => (
            <li
              key={i.id}
              data-testid={`wishlist-item-${i.productId}`}
              className="border rounded p-3 bg-white flex items-center justify-between"
            >
              <div>
                <Link
                  href={`/products/${i.productId}`}
                  className="font-medium text-gray-900 hover:underline"
                >
                  {i.product.name}
                </Link>
                <p className="text-sm text-gray-600">
                  ${(i.product.priceCents / 100).toFixed(2)} · Stock{' '}
                  {i.product.stock}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => void moveToCart(i.productId)}
                  disabled={i.product.stock === 0}
                  data-testid={`wishlist-move-${i.productId}`}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded disabled:bg-gray-300"
                >
                  Move to cart
                </button>
                <button
                  onClick={() => void remove(i.productId)}
                  data-testid={`wishlist-remove-${i.productId}`}
                  className="px-3 py-1.5 border text-sm rounded"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
