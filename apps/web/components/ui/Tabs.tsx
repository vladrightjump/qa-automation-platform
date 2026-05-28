'use client';

import { useRef, type KeyboardEvent, type ReactNode } from 'react';

export interface TabItem {
  id: string;
  label: ReactNode;
  content: ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  testId?: string;
}

export default function Tabs({
  tabs,
  activeId,
  onChange,
  testId = 'tabs',
}: TabsProps) {
  const listRef = useRef<HTMLDivElement>(null);

  function onKey(e: KeyboardEvent<HTMLButtonElement>) {
    const idx = tabs.findIndex((t) => t.id === activeId);
    if (idx < 0) return;
    let next = idx;
    if (e.key === 'ArrowRight') next = (idx + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    else return;
    e.preventDefault();
    const target = tabs[next];
    if (!target) return;
    const nextId = target.id;
    onChange(nextId);
    requestAnimationFrame(() => {
      const btn = listRef.current?.querySelector<HTMLButtonElement>(
        `[data-testid="${testId}-trigger-${nextId}"]`,
      );
      btn?.focus();
    });
  }

  const active = tabs.find((t) => t.id === activeId);

  return (
    <div data-testid={testId}>
      <div
        ref={listRef}
        role="tablist"
        className="flex border-b border-gray-200 gap-1"
      >
        {tabs.map((t) => {
          const selected = t.id === activeId;
          return (
            <button
              key={t.id}
              role="tab"
              type="button"
              data-testid={`${testId}-trigger-${t.id}`}
              aria-selected={selected}
              aria-controls={`${testId}-panel-${t.id}`}
              id={`${testId}-trigger-${t.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(t.id)}
              onKeyDown={onKey}
              className={`px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${
                selected
                  ? 'border-blue-600 text-blue-700 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {active && (
        <div
          role="tabpanel"
          id={`${testId}-panel-${active.id}`}
          aria-labelledby={`${testId}-trigger-${active.id}`}
          data-testid={`${testId}-panel-${active.id}`}
          className="pt-4"
        >
          {active.content}
        </div>
      )}
    </div>
  );
}
