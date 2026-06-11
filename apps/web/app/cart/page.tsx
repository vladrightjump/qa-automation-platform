'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, type Cart } from '@/lib/api';
import { useRequireAuth } from '@/lib/use-require-auth';
import Button from '@/components/ui/Button';
import CartTable from '@/components/CartTable';
import Recommendations from '@/components/Recommendations';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import EmptyCart from '@/components/illustrations/EmptyCart';

export default function CartPage() {
  const { token } = useRequireAuth();
  const [cart, setCart] = useState<Cart | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setCart(await api.getCart(token));
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!cart) {
    return (
      <section className="space-y-4">
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink">
          Your cart
        </h1>
        <div className="bg-card rounded-[10px] border border-line p-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton variant="block" width={48} height={48} />
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
      <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink">
        Your cart
      </h1>
      {isEmpty ? (
        <EmptyState
          icon={<EmptyCart />}
          title="Your cart is empty"
          description="Browse the catalog and add a few things to see them here."
          action={
            <Button as="link" href="/" variant="primary" size="md">
              Browse products
            </Button>
          }
        />
      ) : (
        <div className="bg-card rounded-[10px] border border-line p-5">
          <CartTable cart={cart} onChange={load} />
        </div>
      )}
      {!isEmpty && (
        <Button
          as="link"
          href="/checkout"
          variant="primary"
          size="md"
          data-testid="cart-checkout"
        >
          Proceed to checkout
          <span aria-hidden="true">→</span>
        </Button>
      )}
      <Recommendations excludeId={null} />
    </section>
  );
}
