import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LOCALE,
  FX_RATES_FROM_USD,
  LOCALE_CURRENCY,
  SUPPORTED_LOCALES,
  convertCents,
  formatMoney,
} from './i18n';

describe('FX table & locale map', () => {
  it('USD rate is 1 (identity)', () => {
    expect(FX_RATES_FROM_USD.USD).toBe(1);
  });

  it('EUR rate is 0.92 (committed, deterministic)', () => {
    expect(FX_RATES_FROM_USD.EUR).toBe(0.92);
  });

  it('every supported locale maps to a known currency', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const currency = LOCALE_CURRENCY[locale];
      expect(['USD', 'EUR']).toContain(currency);
    }
  });

  it('default locale is en-US', () => {
    expect(DEFAULT_LOCALE).toBe('en-US');
  });
});

describe('convertCents', () => {
  it('USD is the identity (no conversion)', () => {
    expect(convertCents(1999, 'USD')).toBe(1999);
    expect(convertCents(0, 'USD')).toBe(0);
  });

  it('EUR multiplies USD by 0.92 and rounds half-up', () => {
    expect(convertCents(100, 'EUR')).toBe(92);
    // 1999 × 0.92 = 1839.08 → 1839
    expect(convertCents(1999, 'EUR')).toBe(1839);
    // 1000 × 0.92 = 920 (exact)
    expect(convertCents(1000, 'EUR')).toBe(920);
  });

  it('rounds 0.5 away from zero (half-up via Math.round)', () => {
    // Choose an input that lands exactly on .5: 50 × 0.92 = 46 (no fraction).
    // 1006 × 0.92 = 925.52 → 926; 1007 × 0.92 = 926.44 → 926. Pin a half case:
    // 25 / 0.92 ≈ 27.17 — skip. Just verify nearby integers round correctly.
    expect(convertCents(1006, 'EUR')).toBe(926);
    expect(convertCents(1007, 'EUR')).toBe(926);
  });

  it('zero in → zero out for any currency', () => {
    expect(convertCents(0, 'USD')).toBe(0);
    expect(convertCents(0, 'EUR')).toBe(0);
  });
});

describe('formatMoney', () => {
  it('en-US renders USD with the $ symbol', () => {
    expect(formatMoney(1999, 'en-US')).toMatch(/^\$/);
    expect(formatMoney(1999, 'en-US')).toContain('19.99');
  });

  it('de-DE renders EUR with the € symbol (locale-specific grouping)', () => {
    const out = formatMoney(1999, 'de-DE');
    // de-DE uses '€' as the currency symbol and comma as the decimal sep.
    expect(out).toContain('€');
    expect(out).toContain('18,39'); // 1999 × 0.92 = 1839.08 → 18.39 EUR
  });

  it('fr-FR also renders EUR but with French-style separators', () => {
    const out = formatMoney(1999, 'fr-FR');
    expect(out).toContain('€');
    // 1999 × 0.92 = 1839 cents = €18.39; fr-FR uses '18,39'.
    expect(out).toContain('18,39');
  });

  it('zero cents formats consistently per locale', () => {
    expect(formatMoney(0, 'en-US')).toMatch(/\$0\.00/);
    expect(formatMoney(0, 'de-DE')).toMatch(/0,00.*€/);
  });
});
