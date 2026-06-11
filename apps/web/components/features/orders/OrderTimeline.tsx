'use client';

import type { OrderStatus } from '@/lib/api';

const STEPS: { id: OrderStatus; label: string }[] = [
  { id: 'PENDING', label: 'Pending' },
  { id: 'PAID', label: 'Paid' },
  { id: 'FULFILLED', label: 'Fulfilled' },
];

function stepReached(current: OrderStatus, step: OrderStatus): boolean {
  if (current === 'CANCELLED') return false;
  const order: OrderStatus[] = ['PENDING', 'PAID', 'FULFILLED'];
  return order.indexOf(current) >= order.indexOf(step);
}

interface OrderTimelineProps {
  status: OrderStatus;
}

export default function OrderTimeline({ status }: OrderTimelineProps) {
  return (
    <div
      data-testid="order-timeline"
      className="border border-line rounded-[10px] p-5 bg-card"
    >
      <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-faint mb-3">
        Status
      </p>
      <ol className="flex items-center gap-2">
        {STEPS.map((step, idx) => {
          const reached = stepReached(status, step.id);
          return (
            <li
              key={step.id}
              data-testid={`order-timeline-step-${step.id}`}
              data-reached={reached}
              className="flex items-center gap-2"
            >
              <span
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold transition-colors ${
                  reached
                    ? 'bg-sage-100 text-sage-500'
                    : 'bg-paper-deep text-ink-faint'
                }`}
              >
                {idx + 1}
              </span>
              <span
                className={`text-[13.5px] ${reached ? 'text-ink font-medium' : 'text-ink-faint'}`}
              >
                {step.label}
              </span>
              {idx < STEPS.length - 1 && (
                <span className="text-line-strong">→</span>
              )}
            </li>
          );
        })}
        {status === 'CANCELLED' && (
          <li
            data-testid="order-timeline-cancelled"
            className="ml-3 text-danger-500 text-[13.5px] font-medium"
          >
            Cancelled
          </li>
        )}
      </ol>
    </div>
  );
}
