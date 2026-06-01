// Shared constants for the orders feature. Centralised so producers and the
// API/DB test assertions reference the same values and can't drift.

// Loyalty: customers earn this fraction of the charged total back as store
// credit (1 point = 1¢). Kept as a constant so tests can reason about it.
export const LOYALTY_EARN_RATE = 0.05;

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
