import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import {
  FX_RATES_FROM_USD,
  SUPPORTED_LOCALES,
  convertCents,
  formatMoney,
} from './i18n';

const localeArb = fc.constantFrom(...SUPPORTED_LOCALES);

describe('convertCents — properties', () => {
  it('USD is the identity (output = input) for any integer cents', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1_000_000_000, max: 1_000_000_000 }),
        (cents) => convertCents(cents, 'USD') === cents,
      ),
    );
  });

  it('EUR output is consistent with the committed rate (within ±1 cent of round(n×rate))', () => {
    const rate = FX_RATES_FROM_USD.EUR;
    fc.assert(
      fc.property(fc.nat({ max: 1_000_000_000 }), (cents) => {
        const out = convertCents(cents, 'EUR');
        const expected = Math.round(cents * rate);
        return Math.abs(out - expected) <= 1;
      }),
    );
  });

  it('zero in → zero out for any supported currency', () => {
    fc.assert(
      fc.property(fc.constantFrom('USD', 'EUR' as const), (currency) => {
        return convertCents(0, currency as 'USD' | 'EUR') === 0;
      }),
    );
  });

  it('output is always an integer', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 1_000_000_000 }),
        fc.constantFrom('USD', 'EUR' as const),
        (cents, currency) =>
          Number.isInteger(convertCents(cents, currency as 'USD' | 'EUR')),
      ),
    );
  });
});

describe('formatMoney — properties', () => {
  it('never throws for any integer cents + supported locale', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1_000_000_000, max: 1_000_000_000 }),
        localeArb,
        (cents, locale) => {
          expect(() => formatMoney(cents, locale)).not.toThrow();
          return true;
        },
      ),
    );
  });

  it('en-US output contains a "$" symbol', () => {
    fc.assert(
      fc.property(fc.nat({ max: 1_000_000_000 }), (cents) => {
        return formatMoney(cents, 'en-US').includes('$');
      }),
    );
  });

  it('de-DE and fr-FR output contains a "€" symbol', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 1_000_000_000 }),
        fc.constantFrom('de-DE', 'fr-FR' as const),
        (cents, locale) =>
          formatMoney(cents, locale as 'de-DE' | 'fr-FR').includes('€'),
      ),
    );
  });
});
