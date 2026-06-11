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
import { useLocale } from '@/lib/i18n';

export default function WishlistPage() {
  const toast = useToast();
  const { token, isHydrated, refreshCartCount } = useRequireAuth();
  const { formatMoney } = useLocale();
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

  if (!isHydrated || !token) return <p className="text-ink-faint">Loading…</p>;

  return (
    <section className="space-y-6" data-testid="wishlist-page">
      <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink">Wishlist</h1>
      {!wishlist && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-card rounded-[10px] border border-line p-4"
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
              className="inline-flex items-center bg-clay-500 hover:bg-clay-600 text-card text-sm font-medium px-4 py-2 rounded-lg transition-colors active:scale-95"
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
              className="animate-fade-in border border-line rounded-[10px] p-4 bg-card flex items-center justify-between gap-4 hover:bg-paper-deep transition-colors duration-150"
            >
              <div className="min-w-0">
                <Link
                  href={`/products/${i.productId}`}
                  className="text-[14.5px] font-semibold text-ink hover:text-clay-600 transition-colors"
                >
                  {i.product.name}
                </Link>
                <p className="text-[12.5px] text-ink-soft tabular-nums">
                  {formatMoney(i.product.priceCents)} · Stock {i.product.stock}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="accent-outline"
                  size="sm"
                  onClick={() => void moveToCart(i.productId)}
                  disabled={i.product.stock === 0}
                  data-testid={`wishlist-move-${i.productId}`}
                >
                  Move to cart
                </Button>
                <button
                  type="button"
                  onClick={() => void remove(i.productId)}
                  data-testid={`wishlist-remove-${i.productId}`}
                  className="text-[13px] text-ink-faint hover:text-clay-500 transition-colors"
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
