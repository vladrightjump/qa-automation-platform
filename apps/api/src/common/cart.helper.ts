import { prisma } from '@qa/db';

/**
 * Canonical cart-with-items+products fetch used by both CartService and
 * OrdersService. Includes are kept in one place so callers don't accidentally
 * miss the product join (which would N+1 in the service).
 */
export function getCartWithItems(userId: string) {
  return prisma.cart.findUnique({
    where: { userId },
    include: { items: { include: { product: true } } },
  });
}

/**
 * Find-or-create the cart row for a user. The cart row is created lazily on
 * first add-to-cart; this preserves that invariant in one place.
 */
export async function findOrCreateCart(userId: string) {
  const existing = await getCartWithItems(userId);
  if (existing) return existing;
  await prisma.cart.create({ data: { userId } });
  return getCartWithItems(userId);
}
