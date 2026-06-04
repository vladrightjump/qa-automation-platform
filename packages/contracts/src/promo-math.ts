// Pure discount arithmetic — extracted from PromoService so unit + mutation
// tests can drive it without spinning up Nest or Prisma. The service still
// owns the DB lookups, validations, and the redemption side-effects; this
// module only owns the math.
//
// Invariants:
//   - Discount is never negative and never exceeds the order total.
//   - Percent-off uses floor rounding (consumer-friendly when the percent
//     produces a fractional cent — favours the merchant by at most 1¢).
//   - When neither field is set the discount is 0 (caller decides whether
//     that's a misconfiguration or a no-op).

export interface PromoDiscountInput {
  percentOff: number | null;
  flatOffCents: number | null;
}

export interface ComputeDiscountResult {
  discountCents: number;
}

export function computeDiscount(
  subtotalCents: number,
  promo: PromoDiscountInput,
): ComputeDiscountResult {
  if (promo.percentOff != null) {
    const raw = Math.floor((subtotalCents * promo.percentOff) / 100);
    return { discountCents: Math.min(subtotalCents, raw) };
  }
  // Stryker disable next-line ConditionalExpression: equivalent mutant.
  // Forcing this branch to `true` still yields 0 for null flatOffCents
  // (Math.min(subtotalCents, null) === 0), matching the default-return
  // path — no observable difference, no real coverage gap.
  if (promo.flatOffCents != null) {
    return { discountCents: Math.min(subtotalCents, promo.flatOffCents) };
  }
  return { discountCents: 0 };
}
