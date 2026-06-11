import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-3 flex-wrap">
      <div className="space-y-1.5">
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[13.5px] text-ink-faint">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
