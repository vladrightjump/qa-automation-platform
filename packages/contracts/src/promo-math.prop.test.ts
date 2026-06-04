import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { computeDiscount } from './promo-math';

// Property-based companion to promo-math.test.ts (phase 17). Each property
// formalises an invariant the example tests assert at a few hand-picked
// points; fast-check exercises ~100 random inputs per run and shrinks any
// counterexample to a minimal failing case.
describe('computeDiscount — properties', () => {
  it('percent-off: discount is always in [0, subtotal]', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 1_000_000_000 }),
        fc.integer({ min: 0, max: 200 }),
        (subtotal, percent) => {
          const { discountCents } = computeDiscount(subtotal, {
            percentOff: percent,
            flatOffCents: null,
          });
          return discountCents >= 0 && discountCents <= subtotal;
        },
      ),
    );
  });

  it('percent-off: matches floor((subtotal × percent) / 100) clamped to subtotal', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 1_000_000_000 }),
        fc.integer({ min: 0, max: 100 }),
        (subtotal, percent) => {
          const expected = Math.min(
            subtotal,
            Math.floor((subtotal * percent) / 100),
          );
          return (
            computeDiscount(subtotal, { percentOff: percent, flatOffCents: null })
              .discountCents === expected
          );
        },
      ),
    );
  });

  it('flat-off: discount equals min(subtotal, flatOffCents)', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 1_000_000_000 }),
        fc.nat({ max: 1_000_000_000 }),
        (subtotal, flat) => {
          const { discountCents } = computeDiscount(subtotal, {
            percentOff: null,
            flatOffCents: flat,
          });
          return discountCents === Math.min(subtotal, flat);
        },
      ),
    );
  });

  it('percent-off takes precedence over flat-off when both are set', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 1_000_000_000 }),
        fc.integer({ min: 0, max: 100 }),
        fc.nat({ max: 1_000_000_000 }),
        (subtotal, percent, flat) => {
          const both = computeDiscount(subtotal, {
            percentOff: percent,
            flatOffCents: flat,
          }).discountCents;
          const percentOnly = computeDiscount(subtotal, {
            percentOff: percent,
            flatOffCents: null,
          }).discountCents;
          return both === percentOnly;
        },
      ),
    );
  });

  it('no percent and no flat → discount is always 0', () => {
    fc.assert(
      fc.property(fc.nat({ max: 1_000_000_000 }), (subtotal) => {
        return (
          computeDiscount(subtotal, { percentOff: null, flatOffCents: null })
            .discountCents === 0
        );
      }),
    );
  });
});
