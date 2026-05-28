'use client';

import type { ChangeEvent } from 'react';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

interface SelectProps<T extends string = string> {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  label?: string;
  testId?: string;
}

export default function Select<T extends string = string>({
  value,
  options,
  onChange,
  label,
  testId,
}: SelectProps<T>) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-700">
      {label && <span>{label}</span>}
      <select
        value={value}
        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
          onChange(e.target.value as T)
        }
        data-testid={testId}
        className="border rounded px-2 py-1 bg-white"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
