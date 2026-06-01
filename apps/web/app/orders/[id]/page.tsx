'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, type Order, type OrderStatus } from '@/lib/api';
import { useRequireAuth } from '@/lib/use-require-auth';
import { useToast } from '@/components/ui/ToastQueue';
import OrderSummary from '@/components/OrderSummary';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Skeleton from '@/components/ui/Skeleton';
import Confetti from '@/components/Confetti';
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
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [showConfetti, setShowConfetti] = useState(justPlaced);

  useEffect(() => {
    if (!justPlaced) return;
    const handle = setTimeout(() => setShowConfetti(false), 2800);
    return () => clearTimeout(handle);
  }, [justPlaced]);

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

  async function submitReturn() {
    if (!token || !order) return;
    try {
      await api.requestReturn(token, order.id, returnReason.trim());
      const refreshed = await api.getOrder(token, order.id);
      setOrder(refreshed);
      setReturnOpen(false);
      setReturnReason('');
      toast.push({ variant: 'success', message: 'Return requested' });
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
  const latestReturn = order.returns?.[0] ?? null;
  const hasOpenReturn = (order.returns ?? []).some(
    (r) => r.status !== 'REJECTED',
  );
  const returnable =
    (order.status === 'PAID' || order.status === 'FULFILLED') &&
    !hasOpenReturn;

  return (
    <div className="space-y-5">
      {justPlaced && showConfetti && <Confetti />}

      {justPlaced && (
        <section
          data-testid="order-confirmation-hero"
          className="animate-fade-in border border-green-100 bg-gradient-to-br from-green-50 via-white to-brand-50 rounded-2xl p-6 text-center shadow-card"
        >
          <div className="mx-auto w-16 h-16 rounded-full bg-green-500 text-card flex items-center justify-center text-3xl shadow-pop animate-check-pop">
            ✓
          </div>
          <h1
            data-testid="order-confirmation-title"
            className="mt-3 text-2xl font-bold tracking-tight text-ink"
          >
            Order confirmed!
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            Order{' '}
            <span className="font-mono text-ink">{order.id}</span> is on
            its way. A receipt is below.
          </p>
          <div className="flex items-center justify-center gap-2 pt-4">
            <Link
              href="/"
              data-testid="order-confirmation-continue"
              className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-card text-sm font-medium px-4 py-2 rounded-full transition-colors active:scale-95"
            >
              Continue shopping <span aria-hidden="true">→</span>
            </Link>
            <Link
              href="/orders"
              className="px-4 py-2 border border-line hover:border-line-strong hover:bg-paper-deep text-sm rounded-full transition-colors"
            >
              View all orders
            </Link>
          </div>
        </section>
      )}

      <OrderSummary order={order} />

      <div
        data-testid="order-timeline"
        className="border border-line rounded-2xl p-4 bg-card shadow-card"
      >
        <p className="text-sm font-semibold text-ink-soft mb-3">Status</p>
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
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                    reached
                      ? 'bg-brand-600 text-card shadow-sm'
                      : 'bg-paper-deep text-ink-faint'
                  }`}
                >
                  {idx + 1}
                </span>
                <span
                  className={`text-sm ${reached ? 'text-ink font-medium' : 'text-ink-faint'}`}
                >
                  {step.label}
                </span>
                {idx < TIMELINE.length - 1 && (
                  <span className="text-line-strong">→</span>
                )}
              </li>
            );
          })}
          {order.status === 'CANCELLED' && (
            <li
              data-testid="order-timeline-cancelled"
              className="ml-3 text-red-600 text-sm font-medium"
            >
              Cancelled
            </li>
          )}
        </ol>
      </div>

      {latestReturn && (
        <div
          data-testid="order-return-status"
          data-status={latestReturn.status}
          className="border border-amber-100 bg-amber-50 rounded-2xl px-4 py-3 text-sm"
        >
          <span className="font-semibold text-amber-800">Return</span>{' '}
          <span className="text-amber-700">{latestReturn.status}</span>
          <span className="text-ink-soft"> — {latestReturn.reason}</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        {cancellable && (
          <button
            type="button"
            onClick={() => setConfirmCancel(true)}
            data-testid="order-cancel"
            className="px-4 py-1.5 border border-red-300 hover:border-red-500 hover:bg-red-50 text-red-600 rounded-full text-sm font-medium transition-colors"
          >
            Cancel order
          </button>
        )}
        {returnable && (
          <button
            type="button"
            onClick={() => setReturnOpen(true)}
            data-testid="order-return"
            className="px-4 py-1.5 border border-amber-300 hover:border-amber-500 hover:bg-amber-50 text-amber-700 rounded-full text-sm font-medium transition-colors"
          >
            Request return
          </button>
        )}
      </div>

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

      <Modal
        open={returnOpen}
        onClose={() => setReturnOpen(false)}
        title="Request a return"
        testId="order-return-modal"
      >
        <p className="text-sm mb-3 text-ink-soft">
          Tell us why you’re returning this order. An admin will review the
          request.
        </p>
        <label htmlFor="return-reason" className="sr-only">
          Return reason
        </label>
        <textarea
          id="return-reason"
          value={returnReason}
          onChange={(e) => setReturnReason(e.target.value)}
          placeholder="Reason for return…"
          data-testid="order-return-reason"
          rows={3}
          className="w-full border border-line rounded-xl px-3 py-2 text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-shadow"
        />
        <div className="flex justify-end gap-2 mt-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setReturnOpen(false)}
            data-testid="order-return-cancel"
          >
            Cancel
          </Button>
          <button
            onClick={() => void submitReturn()}
            disabled={returnReason.trim().length < 3}
            data-testid="order-return-submit"
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-card rounded-full text-sm font-medium transition-colors"
          >
            Submit request
          </button>
        </div>
      </Modal>
    </div>
  );
}
