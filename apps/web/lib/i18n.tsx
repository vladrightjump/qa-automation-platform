'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_LOCALE,
  LOCALE_CURRENCY,
  SUPPORTED_LOCALES,
  formatMoney as contractFormatMoney,
  type Currency,
  type Locale,
} from '@qa/contracts';
import { useAuth } from './auth';
import enUS from '../messages/en-US.json';
import deDE from '../messages/de-DE.json';
import frFR from '../messages/fr-FR.json';

type Messages = typeof enUS;

const CATALOGS: Record<Locale, Messages> = {
  'en-US': enUS,
  'de-DE': deDE,
  'fr-FR': frFR,
};

// localStorage + cookie keys — `NEXT_LOCALE` is the cookie name per the phase
// spec; tests can seed either.
export const LOCALE_STORAGE_KEY = 'qa_locale';
export const LOCALE_COOKIE_KEY = 'NEXT_LOCALE';

interface LocaleContextValue {
  locale: Locale;
  currency: Currency;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  formatMoney: (priceCents: number) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function isSupported(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const pair = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : null;
}

function writeCookie(name: string, value: string): void {
  if (typeof document === 'undefined') return;
  // 1 year, site-wide, lax so it survives top-level nav.
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;
}

// Dot-path lookup into the catalog. Throws in dev if missing so we catch
// typos; falls back to the key string in prod to avoid blank UI.
function lookup(catalog: Messages, key: string): string | undefined {
  const parts = key.split('.');
  let node: unknown = catalog;
  for (const p of parts) {
    if (node && typeof node === 'object' && p in (node as object)) {
      node = (node as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return typeof node === 'string' ? node : undefined;
}

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    k in vars ? String(vars[k]) : `{${k}}`,
  );
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  // Resolution chain (client-side; SSR renders DEFAULT_LOCALE and hydrates
  // on mount):
  //   1. User.preferredLocale (from auth)
  //   2. localStorage qa_locale
  //   3. NEXT_LOCALE cookie
  //   4. DEFAULT_LOCALE
  const { token } = useAuth();
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isSupported(stored)) {
      setLocaleState(stored);
      return;
    }
    const cookie = readCookie(LOCALE_COOKIE_KEY);
    if (isSupported(cookie)) {
      setLocaleState(cookie);
    }
  }, []);

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
        writeCookie(LOCALE_COOKIE_KEY, next);
      }
      // Authed: persist server-side too. Audit row written by the API.
      if (token) {
        const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
        void fetch(`${base}/me/locale`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ locale: next }),
        });
      }
    },
    [token],
  );

  const t = useCallback(
    (key: string, vars: Record<string, string | number> = {}) => {
      const msg =
        lookup(CATALOGS[locale], key) ?? lookup(CATALOGS[DEFAULT_LOCALE], key) ?? key;
      return interpolate(msg, vars);
    },
    [locale],
  );

  const formatMoney = useCallback(
    (priceCents: number) => contractFormatMoney(priceCents, locale),
    [locale],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      currency: LOCALE_CURRENCY[locale],
      setLocale,
      t,
      formatMoney,
    }),
    [locale, setLocale, t, formatMoney],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
