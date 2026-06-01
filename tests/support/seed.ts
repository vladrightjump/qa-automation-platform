// Shared seeding helpers for API/integration specs. The "default address →
// add to cart → checkout (PAID)" recipe was re-implemented per spec
// (placePaidOrder / earnViaCheckout, plus inline copies); this is the single
// source so a new feature spec never has to rewrite it.
import type { PrismaClient } from '@qa/db';
import type { Order } from '@qa/contracts';
import { ApiClient } from './api-client';
import { ProductFactory, type ProductData } from '../factories/product.factory';
import { AddressFactory } from '../factories/address.factory';

/** Seed a product straight into the DB (the SUT exposes no product-create). */
export function seedProduct(
  db: PrismaClient,
  overrides: Partial<ProductData> = {},
) {
  return db.product.create({ data: ProductFactory.build(overrides) });
}

/** Give the user a default shipping address via the API. */
export function withDefaultAddress(api: ApiClient, token: string) {
  return api.createAddress(token, AddressFactory.build({ isDefault: true }));
}

export interface SeedPaidOrderOptions {
  token: string;
  priceCents?: number;
  stock?: number;
  qty?: number;
}

/**
 * Place one PAID order for a user: seed a product, give them a default
 * shipping address, add `qty` to the cart, and checkout. Returns the
 * created Order.
 */
export async function seedPaidOrder(
  api: ApiClient,
  db: PrismaClient,
  opts: SeedPaidOrderOptions,
): Promise<Order> {
  const { token, priceCents = 1000, stock = 5, qty = 1 } = opts;
  const product = await seedProduct(db, { stock, priceCents });
  await withDefaultAddress(api, token);
  await api.addToCart(token, product.id, qty);
  return api.checkout(token, { paymentMethod: 'CARD' });
}
