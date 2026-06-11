import { describe, expect, it } from 'vitest';
import { formatMoney } from './money';

describe('formatMoney', () => {
  it('formats USD with en-US locale', () => {
    const out = formatMoney(1234, 'en-US');
    expect(out).toMatch(/\$12\.34|\$\s12\.34/);
  });

  it('converts USD cents to EUR and formats for de-DE', () => {
    // 9900 USD cents × 0.92 (fixed FX) = 9108 EUR cents = €91,08.
    const out = formatMoney(9900, 'de-DE');
    expect(out).toMatch(/91[,.]08/);
  });

  it('handles zero', () => {
    expect(formatMoney(0, 'en-US')).toMatch(/0/);
  });
});
