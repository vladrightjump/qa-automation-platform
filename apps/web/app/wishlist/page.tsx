'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, type Wishlist } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/ToastQueue';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import EmptyWishlist from '@/components/illustrations/EmptyWishlist';
import RecentlyViewed from '@/components/RecentlyViewed';

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
    <section className="space-y-6" data-testid="wishlist-page">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">Wishlist</h1>
      {!wishlist && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-gray-100 shadow-card p-4"
            >
              <Skeleton variant="line" width="60%" />
              <Skeleton variant="line" width="30%" className="mt-2" />
            </div>
          ))}
        </div>
      )}
      {wishlist && wishlist.items.length === 0 && (
        <EmptyState
          testId="wishlist-empty"
          icon={<EmptyWishlist />}
          title="Nothing saved yet"
          description="Tap the heart on a product card to save it for later."
          action={
            <Link
              href="/"
              className="inline-flex items-center bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-full transition-colors active:scale-95"
            >
              Browse products
            </Link>
          }
        />
      )}
      {wishlist && wishlist.items.length > 0 && (
        <ul className="space-y-2">
          {wishlist.items.map((i) => (
            <li
              key={i.id}
              data-testid={`wishlist-item-${i.productId}`}
              className="animate-fade-in border border-gray-100 rounded-2xl p-4 bg-white shadow-card flex items-center justify-between gap-4 hover:shadow-pop transition-shadow"
            >
              <div className="min-w-0">
                <Link
                  href={`/products/${i.productId}`}
                  className="font-medium text-gray-900 hover:text-brand-700 transition-colors"
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
                  className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-full transition-all duration-150 active:scale-95 disabled:bg-gray-300 disabled:active:scale-100"
                >
                  Move to cart
                </button>
                <button
                  onClick={() => void remove(i.productId)}
                  data-testid={`wishlist-remove-${i.productId}`}
                  className="px-3 py-1.5 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-sm rounded-full transition-colors"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <RecentlyViewed excludeId={null} />
    </section>
  );
}
