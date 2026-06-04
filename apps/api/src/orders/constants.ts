// Shared constants for the orders feature. Centralised so producers and the
// API/DB test assertions reference the same values and can't drift.
//
// The loyalty earn rate moved to `@qa/contracts/loyalty-math` (phase 16a)
// so it's mutation-tested alongside the math that uses it. Import
// `LOYALTY_EARN_RATE` from `@qa/contracts` rather than re-defining it.

// AuditLog `action` strings emitted across checkout / cancel / returns /
// loyalty. The specs assert on these exact strings — keep values byte-identical.
export const AuditAction = {
  ORDER_PAID: 'ORDER_PAID',
  PROMO_REDEEMED: 'PROMO_REDEEMED',
  ORDER_CANCELLED: 'ORDER_CANCELLED',
  RETURN_REQUESTED: 'RETURN_REQUESTED',
  LOYALTY_EARNED: 'LOYALTY_EARNED',
  LOYALTY_REDEEMED: 'LOYALTY_REDEEMED',
} as const;
