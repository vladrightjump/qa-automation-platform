import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import {
  LOYALTY_EARN_RATE,
  clampRedemption,
  earnedPoints,
} from './loyalty-math';

describe('earnedPoints — properties', () => {
  it('nonneg input → returns floor(charged × LOYALTY_EARN_RATE), always a nonneg integer', () => {
    fc.assert(
      fc.property(fc.nat({ max: 1_000_000_000 }), (charged) => {
        const result = earnedPoints(charged);
        if (!Number.isInteger(result)) return false;
        if (result < 0) return false;
        if (charged === 0) return result === 0;
        return result === Math.floor(charged * LOYALTY_EARN_RATE);
      }),
    );
  });

  it('zero or negative input → always 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1_000_000_000, max: 0 }),
        (charged) => earnedPoints(charged) === 0,
      ),
    );
  });

  it('monotonic: more charged never earns fewer points', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 1_000_000_000 }),
        fc.nat({ max: 1_000_000_000 }),
        (a, b) => {
          const [lo, hi] = a <= b ? [a, b] : [b, a];
          return earnedPoints(lo) <= earnedPoints(hi);
        },
      ),
    );
  });
});

describe('clampRedemption — properties', () => {
  it('result is always in [0, min(requested, afterPromoCents)] for nonneg inputs', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 1_000_000_000 }),
        fc.nat({ max: 1_000_000_000 }),
        (requested, afterPromo) => {
          const out = clampRedemption(requested, afterPromo);
          return out >= 0 && out <= Math.min(requested, afterPromo);
        },
      ),
    );
  });

  it('positive request inside the order → returns exactly the request', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 1, max: 1_000_000_000 }),
        (requested, afterPromo) => {
          fc.pre(requested <= afterPromo);
          return clampRedemption(requested, afterPromo) === requested;
        },
      ),
    );
  });

  it('any nonpositive input on either axis → returns 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1_000_000, max: 0 }),
        fc.integer({ min: -1_000_000, max: 1_000_000 }),
        (requested, afterPromo) =>
          clampRedemption(requested, afterPromo) === 0,
      ),
    );
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: -1_000_000, max: 0 }),
        (requested, afterPromo) =>
          clampRedemption(requested, afterPromo) === 0,
      ),
    );
  });

  it('monotonic in afterPromoCents: more headroom never reduces the redemption', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.nat({ max: 1_000_000_000 }),
        fc.nat({ max: 1_000_000_000 }),
        (requested, a, b) => {
          const [lo, hi] = a <= b ? [a, b] : [b, a];
          return clampRedemption(requested, lo) <= clampRedemption(requested, hi);
        },
      ),
    );
  });
});
