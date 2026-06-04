// Pure loyalty arithmetic — extracted from LoyaltyService so unit +
// mutation tests can drive it without Nest or Prisma. The service still
// owns balance lookups + the ledger writes; this module only owns:
//
//   - the earn-rate constant,
//   - earnedPoints(): floor of the rate applied to the charged total
//     (favours the merchant by at most 1¢; integer output),
//   - clampRedemption(): the order-side cap that prevents redeeming
//     more cents than the order actually charges.

// Customers earn this fraction of the charged total back as store credit
// (1 point = 1¢). Tests reason about this exact value.
export const LOYALTY_EARN_RATE = 0.05;

/** Points earned from a charged total. Always an integer ≥ 0. */
export function earnedPoints(chargedCents: number): number {
  if (chargedCents <= 0) return 0;
  return Math.floor(chargedCents * LOYALTY_EARN_RATE);
}

/**
 * Cap a requested redemption to what the order can still absorb after the
 * promo discount has been applied. Caller is responsible for verifying the
 * balance covers `requested` — this just clamps to the order ceiling.
 */
export function clampRedemption(
  requestedPoints: number,
  afterPromoCents: number,
): number {
  if (requestedPoints <= 0) return 0;
  if (afterPromoCents <= 0) return 0;
  return Math.min(requestedPoints, afterPromoCents);
}
