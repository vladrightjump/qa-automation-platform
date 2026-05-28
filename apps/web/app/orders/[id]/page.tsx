'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, type Order, type OrderStatus } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/ToastQueue';
import OrderSummary from '@/components/OrderSummary';
import Modal from '@/components/ui/Modal';
import Toast from '@/components/Toast';

const TIMELINE: { id: OrderStatus; label: string }[] = [
  { id: 'PENDING', label: 'Pending' },
  { id: 'PAID', label: 'Paid' },
  { id: 'FULFILLED', label: 'Fulfilled' },
];

function stepReached(current: OrderStatus, step: OrderStatus): boolean {
  if (current === 'CANCELLED') return false;
  const order: OrderStatus[] = ['PENDING', 'PAID', 'FULFILLED'];
  return order.indexOf(current) >= order.indexOf(step);
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const { token, isHydrated } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

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

  async function cancel() {
    if (!token || !order) return;
    try {
      const updated = await api.cancelOrder(token, order.id);
      setOrder(updated);
      setConfirmCancel(false);
      toast.push({ variant: 'success', message: 'Order cancelled' });
    } catch (e) {
      toast.push({ variant: 'error', message: (e as Error).message });
    }
  }

  if (err) return <Toast message={err} />;
  if (!order) return <p className="text-gray-500">Loading…</p>;

  const cancellable = order.status === 'PENDING' || order.status === 'PAID';

  return (
    <div className="space-y-4">
      <OrderSummary order={order} />

      <div
        data-testid="order-timeline"
        className="border rounded p-3 bg-white"
      >
        <p className="text-sm font-medium mb-2">Status</p>
        <ol className="flex items-center gap-2">
          {TIMELINE.map((step, idx) => {
            const reached = stepReached(order.status, step.id);
            return (
              <li
                key={step.id}
                data-testid={`order-timeline-step-${step.id}`}
                data-reached={reached}
                className="flex items-center gap-2"
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    reached
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {idx + 1}
                </span>
                <span
                  className={
                    reached ? 'text-gray-900' : 'text-gray-500'
                  }
                >
                  {step.label}
                </span>
                {idx < TIMELINE.length - 1 && (
                  <span className="text-gray-300">→</span>
                )}
              </li>
            );
          })}
          {order.status === 'CANCELLED' && (
            <li
              data-testid="order-timeline-cancelled"
              className="ml-3 text-red-600 text-sm"
            >
              Cancelled
            </li>
          )}
        </ol>
      </div>

      {cancellable && (
        <button
          type="button"
          onClick={() => setConfirmCancel(true)}
          data-testid="order-cancel"
          className="px-3 py-1.5 border border-red-600 text-red-600 rounded text-sm"
        >
          Cancel order
        </button>
      )}

      <Modal
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Cancel this order?"
        testId="order-cancel-modal"
      >
        <p className="text-sm mb-3">
          Cancelled orders cannot be reinstated.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setConfirmCancel(false)}
            data-testid="order-cancel-cancel"
            className="px-3 py-1.5 border rounded text-sm"
          >
            Keep order
          </button>
          <button
            onClick={() => void cancel()}
            data-testid="order-cancel-confirm"
            className="px-3 py-1.5 bg-red-600 text-white rounded text-sm"
          >
            Cancel order
          </button>
        </div>
      </Modal>
    </div>
  );
}
