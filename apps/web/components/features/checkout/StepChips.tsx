'use client';

export interface CheckoutStep<Id extends string = string> {
  id: Id;
  label: string;
}

interface StepChipsProps<Id extends string> {
  steps: CheckoutStep<Id>[];
  currentId: Id;
  testId?: string;
}

export default function StepChips<Id extends string>({
  steps,
  currentId,
  testId = 'checkout-steps',
}: StepChipsProps<Id>) {
  const currentIdx = steps.findIndex((s) => s.id === currentId);
  return (
    <ol
      data-testid={testId}
      className="flex items-center gap-2 text-[13px]"
    >
      {steps.map((s, idx) => {
        const active = idx === currentIdx;
        const done = idx < currentIdx;
        const cls = active
          ? 'bg-ink text-card'
          : done
            ? 'bg-sage-100 text-sage-500'
            : 'bg-paper-deep text-ink-faint';
        return (
          <li
            key={s.id}
            data-testid={`checkout-step-${s.id}`}
            data-active={active}
            className={`px-3 py-1 rounded-md font-medium transition-colors duration-150 ${cls}`}
          >
            {s.label}
          </li>
        );
      })}
    </ol>
  );
}
