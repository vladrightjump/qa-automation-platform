import { describe, expect, it } from 'vitest';
import { formatMoney } from './money';

describe('formatMoney', () => {
  it('formats USD', () => {
    expect(formatMoney(1234)).toMatch(/\$12\.34/);
  });

  it('handles zero', () => {
    expect(formatMoney(0)).toMatch(/0/);
  });
});
