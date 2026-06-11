'use client';

import type { ReactNode } from 'react';

interface ProductStripProps<T> {
  title: ReactNode;
  items: T[];
  renderItem: (item: T) => ReactNode;
  testId: string;
}

export default function ProductStrip<T>({
  title,
  items,
  renderItem,
  testId,
}: ProductStripProps<T>) {
  if (items.length === 0) return null;
  return (
    <section data-testid={testId} className="animate-fade-in space-y-3">
      <h2 className="text-[11.5px] font-semibold text-ink-faint uppercase tracking-[0.06em]">
        {title}
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 snap-x snap-mandatory">
        {items.map(renderItem)}
      </div>
    </section>
  );
}
