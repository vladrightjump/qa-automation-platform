import { faker } from '@faker-js/faker';

export interface ProductData {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  stock: number;
}

/**
 * Builds a valid Product shape. The SUT API does not expose product
 * creation, so this is used by specs that seed products directly into
 * the DB via the Prisma client (e.g. tests that need a custom stock
 * level or a brand-new SKU).
 */
export const ProductFactory = {
  build(overrides: Partial<ProductData> = {}): ProductData {
    return {
      id: `prod_${faker.string.alphanumeric(10).toLowerCase()}`,
      name: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      priceCents: faker.number.int({ min: 100, max: 100_000 }),
      stock: faker.number.int({ min: 1, max: 500 }),
      ...overrides,
    };
  },
};
