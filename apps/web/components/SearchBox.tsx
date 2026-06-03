'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, type Suggestion } from '@/lib/api';

const DEBOUNCE_MS = 250;

export default function SearchBox() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [active, setActive] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Debounced fetch — drops in-flight responses when the value changes.
  useEffect(() => {
    const q = value.trim();
    if (!q) {
      setItems([]);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(() => {
      void api
        .suggestProducts(q, 8)
        .then((next) => {
          if (cancelled) return;
          setItems(next);
          setActive(next.length > 0 ? 0 : -1);
        })
        .catch(() => {
          if (!cancelled) setItems([]);
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [value]);

  // Close on outside click.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function submit(target?: Suggestion) {
    const picked = target ?? (active >= 0 ? items[active] : undefined);
    if (picked?.productId) {
      router.push(`/products/${picked.productId}`);
    } else if (value.trim()) {
      router.push(`/search?q=${encodeURIComponent(value.trim())}`);
    }
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <input
        type="search"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search products…"
        data-testid="search-box"
        aria-label="Search products"
        aria-autocomplete="list"
        aria-controls="search-suggestions"
        aria-expanded={open && items.length > 0}
        className="w-full bg-paper-deep border border-line rounded-full px-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay-500/40"
      />
      {open && value.trim() && (
        <ul
          id="search-suggestions"
          role="listbox"
          data-testid="search-suggestions"
          className="absolute left-0 right-0 mt-1 z-40 bg-card border border-line rounded-2xl shadow-pop overflow-hidden text-sm"
        >
          {items.length === 0 ? (
            <li
              data-testid="search-suggestion-empty"
              className="px-3 py-2 text-ink-faint italic"
            >
              No suggestions
            </li>
          ) : (
            items.map((s, i) => (
              <li
                key={s.productId ?? s.value}
                role="option"
                aria-selected={i === active}
                data-testid={`search-suggestion-${s.productId ?? 'free'}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  submit(s);
                }}
                onMouseEnter={() => setActive(i)}
                className={`px-3 py-2 cursor-pointer flex items-center justify-between gap-3 ${
                  i === active ? 'bg-paper-deep text-ink' : 'text-ink-soft'
                }`}
              >
                <span className="truncate">{s.value}</span>
                {s.category && (
                  <span className="text-[10px] uppercase tracking-[0.15em] text-ink-faint">
                    {s.category}
                  </span>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
