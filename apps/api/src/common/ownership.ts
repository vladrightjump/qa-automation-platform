import { prisma } from '@qa/db';
import { notFoundFor } from './errors';

/**
 * Throws the standard 404 if the address doesn't exist or belongs to a
 * different user. Used by the checkout flow and by any future endpoint that
 * needs to verify a saved address.
 */
export async function assertAddressOwnedBy(
  userId: string,
  addressId: string,
): Promise<void> {
  const address = await prisma.address.findFirst({
    where: { id: addressId, userId },
    select: { id: true },
  });
  if (!address) throw notFoundFor('Address', addressId);
}
