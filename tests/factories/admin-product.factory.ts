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
 *
 * The default category is `home` and the default price floor is above the
 * cheapest seeded item per filter category, so parallel admin tests
 * creating random products can't pollute the e2e catalog filter / sort
 * assertions (which scope to `apparel` and `office`). Tests that need a
 * different category should override explicitly.
 */
export const AdminProductFactory = {
  build(overrides: Partial<AdminProductInput> = {}): AdminProductInput {
    return {
      id: `prod_${faker.string.alphanumeric(10).toLowerCase()}`,
      name: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      priceCents: faker.number.int({ min: 10_000, max: 100_000 }),
      stock: faker.number.int({ min: 1, max: 500 }),
      category: 'home',
      tags: [],
      ...overrides,
    };
  },
};
