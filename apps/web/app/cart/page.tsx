'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, type Cart } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import CartTable from '@/components/CartTable';
import RecentlyViewed from '@/components/RecentlyViewed';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import EmptyCart from '@/components/illustrations/EmptyCart';

export default function CartPage() {
  const router = useRouter();
  const { token, isHydrated } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);

  const load = useCallback(async () => {
    if (!isHydrated) return;
    if (!token) {
      router.push('/login');
      return;
    }
    setCart(await api.getCart(token));
  }, [isHydrated, token, router]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!cart) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Your cart
        </h1>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton variant="circle" width={48} height={48} />
              <div className="flex-1 space-y-2">
                <Skeleton variant="line" width="60%" />
                <Skeleton variant="line" width="30%" />
              </div>
              <Skeleton variant="line" width={80} height={16} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  const isEmpty = cart.items.length === 0;

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">
        Your cart
      </h1>
      {isEmpty ? (
        <EmptyState
          icon={<EmptyCart />}
          title="Your cart is empty"
          description="Browse the catalog and add a few things to see them here."
          action={
            <Link
              href="/"
              className="inline-flex items-center bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-full transition-colors active:scale-95"
            >
              Browse products
            </Link>
          }
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4">
          <CartTable cart={cart} onChange={load} />
        </div>
      )}
      {!isEmpty && (
        <Link
          href="/checkout"
          data-testid="cart-checkout"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-full transition-all duration-150 active:scale-95"
        >
          Proceed to checkout
          <span aria-hidden="true">→</span>
        </Link>
      )}
      <RecentlyViewed excludeId={null} />
    </section>
  );
}
