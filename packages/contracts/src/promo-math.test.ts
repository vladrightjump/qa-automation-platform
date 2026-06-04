import { describe, expect, it } from 'vitest';
import { computeDiscount } from './promo-math';

// Pure-math tests for the discount helper. These are also the Stryker
// verifier suite for promo-math.ts — assertions are intentionally tight so
// operator-swap / boundary-shift mutants are killed.
describe('computeDiscount', () => {
  it('percent-off: floors the raw value (consumer-friendly rounding)', () => {
    // 10% of 1999¢ = 199.9¢ → 199¢ (favours the merchant by ≤1¢).
    expect(computeDiscount(1999, { percentOff: 10, flatOffCents: null })).toEqual({
      discountCents: 199,
    });
  });

  it('percent-off: 100% returns the full subtotal (clamp is tight, not loose)', () => {
    expect(computeDiscount(2500, { percentOff: 100, flatOffCents: null })).toEqual({
      discountCents: 2500,
    });
  });

  it('percent-off: 0% returns zero', () => {
    expect(computeDiscount(2500, { percentOff: 0, flatOffCents: null })).toEqual({
      discountCents: 0,
    });
  });

  it('percent-off: clamps to subtotal when percent would exceed it', () => {
    // Pathological: 200% of 1000 = 2000, capped to 1000.
    expect(computeDiscount(1000, { percentOff: 200, flatOffCents: null })).toEqual({
      discountCents: 1000,
    });
  });

  it('flat-off: returns the flat amount when it fits', () => {
    expect(computeDiscount(2500, { percentOff: null, flatOffCents: 500 })).toEqual({
      discountCents: 500,
    });
  });

  it('flat-off: clamps to subtotal when the flat exceeds it', () => {
    expect(computeDiscount(300, { percentOff: null, flatOffCents: 500 })).toEqual({
      discountCents: 300,
    });
  });

  it('flat-off: equal to subtotal returns the subtotal (boundary)', () => {
    expect(computeDiscount(500, { percentOff: null, flatOffCents: 500 })).toEqual({
      discountCents: 500,
    });
  });

  it('percent-off wins over flat-off when both are set', () => {
    // Branch order: percentOff is checked first.
    expect(
      computeDiscount(1000, { percentOff: 10, flatOffCents: 999 }),
    ).toEqual({ discountCents: 100 });
  });

  it('no percent, no flat: returns zero', () => {
    expect(computeDiscount(1000, { percentOff: null, flatOffCents: null })).toEqual({
      discountCents: 0,
    });
  });

  it('zero subtotal: discount is always zero regardless of input', () => {
    expect(computeDiscount(0, { percentOff: 25, flatOffCents: null })).toEqual({
      discountCents: 0,
    });
    expect(computeDiscount(0, { percentOff: null, flatOffCents: 100 })).toEqual({
      discountCents: 0,
    });
    expect(computeDiscount(0, { percentOff: null, flatOffCents: null })).toEqual({
      discountCents: 0,
    });
  });
});
