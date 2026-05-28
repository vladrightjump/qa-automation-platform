import { faker } from '@faker-js/faker';

const CATEGORIES = ['gadgets', 'apparel', 'home', 'office'] as const;
type ProductCategory = (typeof CATEGORIES)[number];

export interface AdminProductInput {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  stock: number;
  category: ProductCategory;
  tags: string[];
}

/**
 * Builds a valid CreateProductDto for the admin/products API. IDs follow
 * the deterministic `prod_…` scheme; consumers may override any field.
 */
export const AdminProductFactory = {
  build(overrides: Partial<AdminProductInput> = {}): AdminProductInput {
    return {
      id: `prod_${faker.string.alphanumeric(10).toLowerCase()}`,
      name: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      priceCents: faker.number.int({ min: 100, max: 100_000 }),
      stock: faker.number.int({ min: 1, max: 500 }),
      category: faker.helpers.arrayElement(CATEGORIES),
      tags: [],
      ...overrides,
    };
  },
};
