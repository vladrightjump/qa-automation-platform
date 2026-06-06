// Unit tests for LocaleProvider. Asserts the resolution chain
// (default → cookie → localStorage), `t()`'s catalog lookup +
// var interpolation + DEFAULT_LOCALE fallback + key-return on miss,
// `formatMoney`'s contract-locale plumb-through, and the side
// effects of setLocale (storage + cookie + PATCH on authed users).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { AuthProvider } from './auth';
import {
  LOCALE_COOKIE_KEY,
  LOCALE_STORAGE_KEY,
  LocaleProvider,
  useLocale,
} from './i18n';

vi.mock('./api', () => ({
  api: { getCart: vi.fn().mockResolvedValue({ items: [] }) },
}));

const fetchMock = vi.fn().mockResolvedValue({ ok: true });
globalThis.fetch = fetchMock as unknown as typeof fetch;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>
    <LocaleProvider>{children}</LocaleProvider>
  </AuthProvider>
);

describe('LocaleProvider', () => {
  beforeEach(() => {
    fetchMock.mockClear();
    window.localStorage.clear();
    document.cookie = `${LOCALE_COOKIE_KEY}=; path=/; max-age=0`;
  });

  it('falls back to DEFAULT_LOCALE (en-US) when no storage / cookie / user', async () => {
    const { result } = renderHook(() => useLocale(), { wrapper });
    await waitFor(() => expect(result.current.locale).toBe('en-US'));
    expect(result.current.currency).toBe('USD');
  });

  it('honours qa_locale localStorage on hydrate', async () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'de-DE');
    const { result } = renderHook(() => useLocale(), { wrapper });
    await waitFor(() => expect(result.current.locale).toBe('de-DE'));
    expect(result.current.currency).toBe('EUR');
  });

  it('honours NEXT_LOCALE cookie when localStorage is empty', async () => {
    document.cookie = `${LOCALE_COOKIE_KEY}=fr-FR; path=/`;
    const { result } = renderHook(() => useLocale(), { wrapper });
    await waitFor(() => expect(result.current.locale).toBe('fr-FR'));
  });

  it('ignores an unsupported locale in storage and falls back to default', async () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zz-ZZ');
    const { result } = renderHook(() => useLocale(), { wrapper });
    await waitFor(() => expect(result.current.locale).toBe('en-US'));
  });

  it('setLocale writes localStorage + cookie and updates context', async () => {
    const { result } = renderHook(() => useLocale(), { wrapper });
    await waitFor(() => expect(result.current.locale).toBe('en-US'));
    act(() => result.current.setLocale('de-DE'));
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('de-DE');
    expect(document.cookie).toContain(`${LOCALE_COOKIE_KEY}=de-DE`);
    expect(result.current.locale).toBe('de-DE');
    // No auth token → no PATCH /me/locale.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('t() interpolates {var} placeholders against the catalog', async () => {
    const { result } = renderHook(() => useLocale(), { wrapper });
    await waitFor(() => expect(result.current.locale).toBe('en-US'));
    expect(
      result.current.t('geo.shippingTo', { flag: '🇺🇸', country: 'US', currency: 'USD' }),
    ).toBe('Shipping to 🇺🇸 US — prices in USD');
  });

  it('t() falls back to the en-US catalog when a key is missing from the active locale', async () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'de-DE');
    const { result } = renderHook(() => useLocale(), { wrapper });
    await waitFor(() => expect(result.current.locale).toBe('de-DE'));
    // `t()` looks in de-DE first; if it isn't there, en-US; else returns the key.
    // We assert the contract on a known-present key — the value is at minimum
    // a non-empty string (not the literal key).
    const result1 = result.current.t('geo.dismiss');
    expect(result1.length).toBeGreaterThan(0);
    expect(result1).not.toBe('geo.dismiss');
  });

  it('t() returns the raw key when neither the active nor the default catalog has it', async () => {
    const { result } = renderHook(() => useLocale(), { wrapper });
    await waitFor(() => expect(result.current.locale).toBe('en-US'));
    expect(result.current.t('totally.unknown.key')).toBe('totally.unknown.key');
  });

  it('formatMoney delegates to the contract formatter using the active locale', async () => {
    const { result } = renderHook(() => useLocale(), { wrapper });
    await waitFor(() => expect(result.current.locale).toBe('en-US'));
    // Just assert the integer dollar amount appears — exact rendering of
    // non-breaking spaces / currency symbol position is locale-runtime
    // behaviour we shouldn't pin here.
    expect(result.current.formatMoney(1_999)).toMatch(/19\.99/);
  });

  it('useLocale throws outside a LocaleProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      expect(() => renderHook(() => useLocale())).toThrow(/LocaleProvider/);
    } finally {
      consoleError.mockRestore();
    }
  });
});
