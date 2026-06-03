'use client';

import { useEffect, useState } from 'react';
import type { Region } from '@qa/contracts';
import { useLocale } from '@/lib/i18n';

const DISMISSED_KEY = 'qa_geo_dismissed';
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// Best-effort flag emoji from an ISO-2 country code. Test surface only needs
// the country/currency strings — the flag is decorative.
function flag(country: string): string {
  if (country.length !== 2) return '🌐';
  const A = 0x1f1e6;
  const a = 'A'.charCodeAt(0);
  const codePoints = [...country.toUpperCase()].map(
    (c) => A + (c.charCodeAt(0) - a),
  );
  return String.fromCodePoint(...codePoints);
}

type GeoStatus = 'idle' | 'requesting' | 'suggested' | 'denied' | 'unavailable';

export default function GeoBanner() {
  const { locale, setLocale, t } = useLocale();
  const [status, setStatus] = useState<GeoStatus>('idle');
  const [suggestion, setSuggestion] = useState<Region | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.sessionStorage.getItem(DISMISSED_KEY)) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unavailable');
      void loadRegions();
      return;
    }
    setStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `${API_BASE}/geo/resolve?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`,
          );
          if (!res.ok) {
            setStatus('unavailable');
            void loadRegions();
            return;
          }
          const region = (await res.json()) as Region;
          setSuggestion(region);
          setStatus('suggested');
        } catch {
          setStatus('unavailable');
          void loadRegions();
        }
      },
      () => {
        setStatus('denied');
        void loadRegions();
      },
      { timeout: 5_000 },
    );
  }, []);

  async function loadRegions() {
    try {
      const res = await fetch(`${API_BASE}/geo/regions`);
      if (res.ok) setRegions((await res.json()) as Region[]);
    } catch {
      // ignore — picker simply stays empty
    }
  }

  function dismiss() {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(DISMISSED_KEY, '1');
    }
    setStatus('idle');
    setSuggestion(null);
  }

  function accept() {
    if (suggestion) setLocale(suggestion.locale);
    dismiss();
  }

  if (status === 'suggested' && suggestion) {
    return (
      <aside
        data-testid="geo-banner"
        className="max-w-5xl mx-auto px-6 pt-3"
      >
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-clay-50 border border-clay-200 px-4 py-2 text-sm text-clay-700">
          <span data-testid="geo-suggestion">
            {t('geo.shippingTo', {
              flag: flag(suggestion.country),
              country: suggestion.name,
              currency: suggestion.currency,
            })}
          </span>
          <span className="flex items-center gap-2">
            <button
              type="button"
              onClick={accept}
              data-testid="geo-accept"
              className="px-3 py-1 rounded-full bg-clay-500 text-card text-xs font-medium hover:bg-clay-600 transition-colors"
            >
              {t('geo.accept')}
            </button>
            <button
              type="button"
              onClick={dismiss}
              data-testid="geo-dismiss"
              className="text-xs text-clay-600 hover:underline"
            >
              {t('geo.dismiss')}
            </button>
          </span>
        </div>
      </aside>
    );
  }

  if (status === 'denied' || status === 'unavailable') {
    return (
      <aside
        data-testid="geo-fallback"
        className="max-w-5xl mx-auto px-6 pt-3"
      >
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-paper-deep border border-line px-4 py-2 text-sm text-ink-soft">
          <span>{t('geo.pickRegion')}</span>
          <select
            data-testid="geo-region-select"
            aria-label={t('geo.pickRegion')}
            value={
              regions.find((r) => r.locale === locale)?.country ?? ''
            }
            onChange={(e) => {
              const r = regions.find((x) => x.country === e.target.value);
              if (r) setLocale(r.locale);
            }}
            className="bg-card border border-line rounded-full px-2 py-1 text-xs"
          >
            <option value="" disabled>
              —
            </option>
            {regions.map((r) => (
              <option
                key={r.country}
                value={r.country}
                data-testid={`geo-region-option-${r.country}`}
              >
                {flag(r.country)} {r.name}
              </option>
            ))}
          </select>
        </div>
      </aside>
    );
  }

  return null;
}
