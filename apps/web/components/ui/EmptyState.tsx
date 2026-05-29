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
      className="animate-fade-in border rounded-2xl p-10 bg-white text-center flex flex-col items-center gap-3 shadow-card"
    >
      {icon && <div className="text-brand-500 mb-1">{icon}</div>}
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {description && (
        <p className="text-sm text-gray-600 max-w-sm">{description}</p>
      )}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
