'use client';

import { useState, type KeyboardEvent } from 'react';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  testId?: string;
}

const SIZE_CLASSES = {
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-2xl',
} as const;

export default function StarRating({
  value,
  onChange,
  readOnly = false,
  size = 'md',
  testId = 'star-rating',
}: StarRatingProps) {
  const [hover, setHover] = useState<number | null>(null);
  const displayed = hover ?? value;

  function set(next: number) {
    if (readOnly || !onChange) return;
    onChange(next);
  }

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (readOnly || !onChange) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(Math.min(5, (value || 0) + 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(Math.max(1, (value || 1) - 1));
    } else if (e.key >= '1' && e.key <= '5') {
      e.preventDefault();
      onChange(Number(e.key));
    }
  }

  return (
    <div
      role={readOnly ? 'img' : 'radiogroup'}
      aria-label={readOnly ? `${value} of 5 stars` : 'Rate this product'}
      data-testid={testId}
      data-value={value}
      tabIndex={readOnly ? -1 : 0}
      onKeyDown={onKey}
      className={`inline-flex gap-0.5 ${SIZE_CLASSES[size]} ${readOnly ? '' : 'cursor-pointer focus:outline focus:outline-2 focus:outline-blue-500 rounded'}`}
    >
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= displayed;
        return (
          <span
            key={i}
            role={readOnly ? undefined : 'radio'}
            aria-checked={readOnly ? undefined : i === value}
            data-testid={`${testId}-star-${i}`}
            onMouseEnter={() => !readOnly && setHover(i)}
            onMouseLeave={() => !readOnly && setHover(null)}
            onClick={() => set(i)}
            className={filled ? 'text-yellow-500' : 'text-gray-300'}
          >
            ★
          </span>
        );
      })}
    </div>
  );
}
