'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, type Order } from '@/lib/api';
import { useRequireAuth } from '@/lib/use-require-auth';
import { useToast } from '@/components/ui/ToastQueue';
import OrderSummary from '@/components/features/cart/OrderSummary';
import OrderTimeline from '@/components/features/orders/OrderTimeline';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Skeleton from '@/components/ui/Skeleton';
import Toast from '@/components/ui/Toast';

export default function OrderDetailPage() {
  return (
    <Suspense fallback={<Skeleton variant="block" className="h-40" />}>
      <OrderDetailInner />
    </Suspense>
  );
}

function OrderDetailInner() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const justPlaced = searchParams.get('just') === '1';
  const toast = useToast();
  const { token } = useRequireAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    if (!token || !params.id) return;
    api
      .getOrder(token, params.id)
      .then(setOrder)
      .catch((e: Error) => setErr(e.message));
  }, [token, params.id]);

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
  if (!order) {
    return (
      <div className="space-y-4">
        <Skeleton variant="block" className="h-32" />
        <Skeleton variant="block" className="h-24" />
      </div>
    );
  }

  const cancellable = order.status === 'PENDING' || order.status === 'PAID';

  return (
    <div className="space-y-5">
      {justPlaced && (
        <section
          data-testid="order-confirmation-hero"
          className="animate-fade-in text-center py-8"
        >
          <div
            className="mx-auto w-13 h-13 rounded-full bg-sage-100 text-sage-500 flex items-center justify-center text-2xl animate-check-pop"
            style={{ width: 52, height: 52 }}
          >
            ✓
          </div>
          <h1
            data-testid="order-confirmation-title"
            className="mt-4 text-[28px] font-semibold tracking-[-0.02em] text-ink"
          >
            Order confirmed
          </h1>
          <p className="text-[13.5px] text-ink-soft mt-1.5">
            Order <span className="font-mono text-ink">{order.id}</span> is on
            its way. A receipt is below.
          </p>
          <div className="flex items-center justify-center gap-2 pt-5">
            <Link
              href="/"
              data-testid="order-confirmation-continue"
              className="inline-flex items-center gap-1.5 bg-clay-500 hover:bg-clay-600 text-card text-sm font-medium px-4 py-2 rounded-lg transition-colors active:scale-95"
            >
              Continue shopping <span aria-hidden="true">→</span>
            </Link>
            <Link
              href="/orders"
              className="px-4 py-2 border border-line-strong hover:bg-paper-deep text-sm text-ink rounded-lg transition-colors"
            >
              View all orders
            </Link>
          </div>
        </section>
      )}

      <OrderSummary order={order} />

      <OrderTimeline status={order.status} />

      {cancellable && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setConfirmCancel(true)}
            data-testid="order-cancel"
            className="px-4 py-1.5 border border-line-strong hover:bg-paper-deep text-danger-500 rounded-lg text-sm font-medium transition-colors"
          >
            Cancel order
          </button>
        </div>
      )}

      <Modal
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Cancel this order?"
        testId="order-cancel-modal"
      >
        <p className="text-sm mb-3 text-ink-soft">
          Cancelled orders cannot be reinstated.
        </p>
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setConfirmCancel(false)}
            data-testid="order-cancel-cancel"
          >
            Keep order
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => void cancel()}
            data-testid="order-cancel-confirm"
          >
            Cancel order
          </Button>
        </div>
      </Modal>
    </div>
  );
}
