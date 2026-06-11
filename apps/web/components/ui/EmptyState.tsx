import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  testId?: string;
}

/**
 * Friendly placeholder for "nothing here" pages. The icon prop is a
 * caller-supplied SVG illustration (see components/illustrations/*).
 */
export default function EmptyState({
  icon,
  title,
  description,
  action,
  testId,
}: EmptyStateProps) {
  return (
    <div
      data-testid={testId}
      className="animate-fade-in border border-line rounded-[10px] p-10 bg-card text-center flex flex-col items-center gap-2"
    >
      {icon && <div className="text-ink-faint mb-1">{icon}</div>}
      <h2 className="text-[16px] font-semibold text-ink">{title}</h2>
      {description && (
        <p className="text-[13.5px] text-ink-soft max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="pt-3">{action}</div>}
    </div>
  );
}
