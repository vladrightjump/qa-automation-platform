'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

interface ProductTileProps {
  href: string;
  name: string;
  priceLabel: string;
  thumb?: ReactNode;
  meta?: ReactNode;
  width?: string;
  testId?: string;
}

const DEFAULT_THUMB = <div className="h-24 bg-paper-deep" />;

export default function ProductTile({
  href,
  name,
  priceLabel,
  thumb = DEFAULT_THUMB,
  meta,
  width = 'w-40',
  testId,
}: ProductTileProps) {
  return (
    <Link
      href={href}
      data-testid={testId}
      className={`snap-start shrink-0 ${width} bg-card rounded-[10px] overflow-hidden border border-line hover:-translate-y-0.5 hover:shadow-pop transition-all duration-200`}
    >
      {thumb}
      <div className="p-2.5">
        <p className="text-xs font-semibold text-ink truncate">{name}</p>
        <p className="text-xs text-ink-soft mt-0.5 tabular-nums">{priceLabel}</p>
        {meta && <div className="mt-1">{meta}</div>}
      </div>
    </Link>
  );
}
