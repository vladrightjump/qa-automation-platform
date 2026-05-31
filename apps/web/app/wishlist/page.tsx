'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type Wishlist } from '@/lib/api';
import { useRequireAuth } from '@/lib/use-require-auth';
import { useToast } from '@/components/ui/ToastQueue';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import EmptyWishlist from '@/components/illustrations/EmptyWishlist';
import RecentlyViewed from '@/components/RecentlyViewed';

export default function WishlistPage() {
  const toast = useToast();
  const { token, isHydrated, refreshCartCount } = useRequireAuth();
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
    if (!isHydrated || !token) return;
    void reload();
  }, [isHydrated, token, reload]);

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
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => void moveToCart(i.productId)}
                  disabled={i.product.stock === 0}
                  data-testid={`wishlist-move-${i.productId}`}
                >
                  Move to cart
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void remove(i.productId)}
                  data-testid={`wishlist-remove-${i.productId}`}
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <RecentlyViewed excludeId={null} />
    </section>
  );
}
