// Shared constants for the orders feature.

// AuditLog `action` strings emitted across checkout / cancel. The specs
// assert on these exact strings — keep values byte-identical.
export const AuditAction = {
  ORDER_PAID: 'ORDER_PAID',
  ORDER_CANCELLED: 'ORDER_CANCELLED',
} as const;
