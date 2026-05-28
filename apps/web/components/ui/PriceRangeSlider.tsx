'use client';

import type { ChangeEvent } from 'react';

interface PriceRangeSliderProps {
  min: number;
  max: number;
  value: { min: number; max: number };
  onChange: (next: { min: number; max: number }) => void;
  testId?: string;
}

function fmt(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

export default function PriceRangeSlider({
  min,
  max,
  value,
  onChange,
  testId = 'price-range',
}: PriceRangeSliderProps) {
  function onMinChange(e: ChangeEvent<HTMLInputElement>) {
    const next = Math.min(Number(e.target.value), value.max);
    onChange({ min: next, max: value.max });
  }
  function onMaxChange(e: ChangeEvent<HTMLInputElement>) {
    const next = Math.max(Number(e.target.value), value.min);
    onChange({ min: value.min, max: next });
  }

  return (
    <div data-testid={testId} className="space-y-1">
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span data-testid={`${testId}-min-label`}>{fmt(value.min)}</span>
        <span data-testid={`${testId}-max-label`}>{fmt(value.max)}</span>
      </div>
      <div className="flex flex-col gap-1">
        <input
          type="range"
          min={min}
          max={max}
          step={100}
          value={value.min}
          onChange={onMinChange}
          data-testid={`${testId}-min`}
          aria-label="Minimum price"
          className="w-full"
        />
        <input
          type="range"
          min={min}
          max={max}
          step={100}
          value={value.max}
          onChange={onMaxChange}
          data-testid={`${testId}-max`}
          aria-label="Maximum price"
          className="w-full"
        />
      </div>
    </div>
  );
}
