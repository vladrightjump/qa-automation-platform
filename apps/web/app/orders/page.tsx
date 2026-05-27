'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, type Order } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import OrderStatusBadge from '@/components/OrderStatusBadge';

export default function OrdersPage() {
  const router = useRouter();
  const { token, isHydrated } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    if (!isHydrated) return;
    if (!token) {
      router.push('/login');
      return;
    }
    api.listOrders(token).then(setOrders);
  }, [isHydrated, token, router]);

  if (!orders) return <p className="text-gray-500">Loading…</p>;
  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-semibold">Your orders</h1>
      {orders.length === 0 ? (
        <p className="text-gray-600">No orders yet.</p>
      ) : (
        <ul className="space-y-2">
          {orders.map((o) => (
            <li
              key={o.id}
              className="border rounded p-3 flex justify-between items-center bg-white"
            >
              <Link href={`/orders/${o.id}`} className="font-mono text-sm">
                {o.id}
              </Link>
              <OrderStatusBadge status={o.status} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
