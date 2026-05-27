'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, type Cart } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import CartTable from '@/components/CartTable';

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

  if (!cart) return <p className="text-gray-500">Loading…</p>;
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Your cart</h1>
      <CartTable cart={cart} onChange={load} />
      {cart.items.length > 0 && (
        <Link
          href="/checkout"
          data-testid="cart-checkout"
          className="inline-block px-4 py-2 bg-green-600 text-white rounded"
        >
          Proceed to checkout
        </Link>
      )}
    </section>
  );
}
