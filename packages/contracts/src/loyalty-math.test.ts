import { describe, expect, it } from 'vitest';
import {
  LOYALTY_EARN_RATE,
  clampRedemption,
  earnedPoints,
} from './loyalty-math';

describe('LOYALTY_EARN_RATE', () => {
  it('is 5% (1 point = 1¢ of store credit)', () => {
    expect(LOYALTY_EARN_RATE).toBe(0.05);
  });
});

describe('earnedPoints', () => {
  it('integer multiple: 2000¢ × 5% = 100 points exactly', () => {
    expect(earnedPoints(2000)).toBe(100);
  });

  it('floors fractional points (favours the merchant by ≤ 1¢)', () => {
    // 1999 × 0.05 = 99.95 → 99.
    expect(earnedPoints(1999)).toBe(99);
  });

  it('zero charged → zero points', () => {
    expect(earnedPoints(0)).toBe(0);
  });

  it('negative charged → zero points (defensive)', () => {
    expect(earnedPoints(-100)).toBe(0);
  });

  it('exactly 1¢ charged → 0 points (boundary above the ≤ 0 guard)', () => {
    // Catches `chargedCents <= 0` mutated to `chargedCents < 0`:
    // the input must produce 0 via the floor math, not via the guard.
    expect(earnedPoints(1)).toBe(0);
  });

  it('one cent below the next integer: 19¢ → 0 points (boundary)', () => {
    expect(earnedPoints(19)).toBe(0);
  });

  it('exactly the floor of one point: 20¢ → 1 point', () => {
    expect(earnedPoints(20)).toBe(1);
  });

  it('result is always a non-negative integer', () => {
    for (const cents of [0, 1, 19, 20, 99, 100, 1234, 99999]) {
      const points = earnedPoints(cents);
      expect(points).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(points)).toBe(true);
    }
  });
});

describe('clampRedemption', () => {
  it('returns the requested amount when it fits inside the order', () => {
    expect(clampRedemption(300, 1000)).toBe(300);
  });

  it('clamps to the order ceiling when requested exceeds it', () => {
    expect(clampRedemption(2000, 1000)).toBe(1000);
  });

  it('boundary: requested === afterPromo → returns the requested amount', () => {
    expect(clampRedemption(500, 500)).toBe(500);
  });

  it('zero requested → zero (no-op)', () => {
    expect(clampRedemption(0, 1000)).toBe(0);
  });

  it('negative requested → zero (defensive against signed input)', () => {
    expect(clampRedemption(-50, 1000)).toBe(0);
  });

  it('exactly 1 point requested with room → returns 1 (boundary above ≤ 0)', () => {
    // Catches `requestedPoints <= 0` mutated to `requestedPoints < 0`.
    expect(clampRedemption(1, 1000)).toBe(1);
  });

  it('order total already zero or negative → zero (nothing to redeem against)', () => {
    expect(clampRedemption(100, 0)).toBe(0);
    expect(clampRedemption(100, -1)).toBe(0);
  });

  it('exactly 1¢ order total with a positive request → 1 (boundary above ≤ 0)', () => {
    // Catches `afterPromoCents <= 0` mutated to `afterPromoCents < 0`.
    expect(clampRedemption(100, 1)).toBe(1);
  });
});
