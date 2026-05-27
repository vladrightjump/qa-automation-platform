'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import Toast from '@/components/Toast';

export default function CheckoutPage() {
  const router = useRouter();
  const { token, isHydrated, refreshCartCount } = useAuth();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function place() {
    if (!isHydrated) return;
    if (!token) {
      router.push('/login');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const order = await api.checkout(token);
      await refreshCartCount();
      router.push(`/orders/${order.id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="max-w-md space-y-3">
      <h1 className="text-2xl font-semibold">Checkout</h1>
      <p className="text-sm text-gray-600">
        Click below to place your order. No real payment is taken.
      </p>
      <button
        onClick={place}
        disabled={busy}
        data-testid="checkout-submit"
        className="px-4 py-2 bg-green-600 text-white rounded disabled:bg-gray-300"
      >
        {busy ? 'Placing…' : 'Place order'}
      </button>
      {err && <Toast message={err} />}
    </section>
  );
}
