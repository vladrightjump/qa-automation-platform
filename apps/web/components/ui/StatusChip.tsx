import type { ReactNode } from 'react';

export type StatusTone =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'accent';

type Size = 'sm' | 'md';

interface StatusChipProps {
  tone?: StatusTone;
  size?: Size;
  children: ReactNode;
  className?: string;
  testId?: string;
}

const TONE_CLASS: Record<StatusTone, string> = {
  neutral: 'bg-paper-deep text-ink-soft',
  success: 'bg-sage-100 text-sage-500',
  warning: 'bg-clay-100 text-clay-700',
  danger: 'bg-paper-deep text-danger-500',
  accent: 'bg-clay-50 text-clay-600',
};

const SIZE_CLASS: Record<Size, string> = {
  sm: 'px-1.5 py-0.5 text-[11px]',
  md: 'px-2 py-0.5 text-[12px]',
};

export default function StatusChip({
  tone = 'neutral',
  size = 'md',
  children,
  className = '',
  testId,
}: StatusChipProps) {
  return (
    <span
      data-testid={testId}
      className={`inline-block rounded-md font-semibold ${TONE_CLASS[tone]} ${SIZE_CLASS[size]} ${className}`.trim()}
    >
      {children}
    </span>
  );
}
