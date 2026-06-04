// Locale & currency config — the single source of truth for i18n, imported by
// the web app, the API, and the test suite (per the Phase 10 contracts-as-SoT
// rule). See todos/phase-14-i18n-geolocation-devices.md.
//
// Locked invariant: money is stored and computed only in canonical USD `*Cents`
// integers. Localization is a *display + suggestion* concern. The helpers below
// convert/format for display; they never change what the DB or the API totals
// hold.
import { z } from 'zod';

export const SUPPORTED_LOCALES = ['en-US', 'de-DE', 'fr-FR'] as const;
export const DEFAULT_LOCALE = 'en-US';

export const LocaleSchema = z.enum(SUPPORTED_LOCALES);

// Stryker disable next-line ArrayDeclaration,StringLiteral
export const CurrencySchema = z.enum(['USD', 'EUR']);

// Which currency each locale displays. en-US → USD; de-DE/fr-FR → EUR.
export const LOCALE_CURRENCY = {
  'en-US': 'USD',
  'de-DE': 'EUR',
  'fr-FR': 'EUR',
} as const satisfies Record<Locale, Currency>;

// Deterministic, fixed FX table — NOT a live feed. Held constant so converted
// amounts are assertable in tests. A live-rate provider would be a separate
// phase (see the phase doc follow-ups).
export const FX_RATES_FROM_USD = {
  USD: 1,
  EUR: 0.92,
} as const satisfies Record<Currency, number>;

/**
 * Convert canonical USD cents into the target currency's minor units (cents),
 * rounding half-up. USD is the identity. Pure and deterministic.
 */
export function convertCents(usdCents: number, currency: Currency): number {
  const rate = FX_RATES_FROM_USD[currency];
  return Math.round(usdCents * rate);
}

/**
 * Format canonical USD cents as a localized currency string. Converts USD →
 * the locale's currency, then renders via Intl.NumberFormat so the symbol,
 * grouping, and decimal separator all follow the locale (e.g. "$12.00" vs
 * "11,04 €"). Display only — the cents argument stays the USD ground truth.
 */
export function formatMoney(usdCents: number, locale: Locale): string {
  const currency = LOCALE_CURRENCY[locale];
  const amount = convertCents(usdCents, currency) / 100;
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}

export type Locale = z.infer<typeof LocaleSchema>;
export type Currency = z.infer<typeof CurrencySchema>;
