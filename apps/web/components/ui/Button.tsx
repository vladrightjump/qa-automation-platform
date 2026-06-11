'use client';

import Link, { type LinkProps } from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'accent-outline';
export type ButtonSize = 'sm' | 'md';

const BASE =
  'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors active:scale-95 disabled:active:scale-100 disabled:cursor-not-allowed';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 hover:bg-brand-700 text-card disabled:bg-line-strong',
  secondary:
    'border border-line-strong text-ink hover:bg-paper-deep disabled:opacity-40',
  ghost: 'text-ink-soft hover:bg-paper-deep disabled:opacity-40',
  danger:
    'bg-danger-500 hover:bg-danger-600 text-card disabled:bg-line-strong',
  'accent-outline':
    'border border-clay-200 text-clay-500 hover:bg-clay-50 rounded-[7px] disabled:opacity-40',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
};

function buttonClasses(
  variant: ButtonVariant,
  size: ButtonSize,
  className?: string,
): string {
  return [BASE, VARIANTS[variant], SIZES[size], className]
    .filter(Boolean)
    .join(' ');
}

interface BaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}

// `as="button"` (default) renders a native button; `as="link"` renders a
// Next.js Link. `...rest` carries through data-testid, disabled, onClick, type,
// href, etc., so call sites behave exactly as before.
type ButtonAsButton = BaseProps & {
  as?: 'button';
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'>;

type ButtonAsLink = BaseProps & {
  as: 'link';
} & Omit<LinkProps, 'className'> & { 'data-testid'?: string };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export default function Button(props: ButtonProps) {
  const { variant = 'primary', size = 'md', className, children } = props;
  const cls = buttonClasses(variant, size, className);

  if (props.as === 'link') {
    const { as: _as, variant: _v, size: _s, className: _c, children: _ch, ...rest } =
      props;
    return (
      <Link className={cls} {...rest}>
        {children}
      </Link>
    );
  }

  const { as: _as, variant: _v, size: _s, className: _c, children: _ch, ...rest } =
    props;
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}
