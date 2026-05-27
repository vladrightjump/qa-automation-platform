'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, type Order } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import OrderSummary from '@/components/OrderSummary';
import Toast from '@/components/Toast';

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { token, isHydrated } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!isHydrated) return;
    if (!token) {
      router.push('/login');
      return;
    }
    if (!params.id) return;
    api
      .getOrder(token, params.id)
      .then(setOrder)
      .catch((e: Error) => setErr(e.message));
  }, [isHydrated, token, params.id, router]);

  if (err) return <Toast message={err} />;
  if (!order) return <p className="text-gray-500">Loading…</p>;
  return <OrderSummary order={order} />;
}
