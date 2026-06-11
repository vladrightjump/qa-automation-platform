import type { HTMLAttributes, ReactNode } from 'react';

type Padding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  padding?: Padding;
  interactive?: boolean;
  children: ReactNode;
}

const PADDING: Record<Padding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

export default function Card({
  padding = 'md',
  interactive = false,
  className = '',
  children,
  ...rest
}: CardProps) {
  const base = 'bg-card border border-line rounded-[10px]';
  const hover = interactive
    ? 'hover:bg-paper-deep transition-colors duration-150'
    : '';
  return (
    <div className={`${base} ${PADDING[padding]} ${hover} ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}
