import { faker } from '@faker-js/faker';

export interface AddressInput {
  label: string;
  name: string;
  line1: string;
  line2?: string;
  city: string;
  postalCode: string;
  country?: string;
  isDefault?: boolean;
}

export const AddressFactory = {
  build(overrides: Partial<AddressInput> = {}): AddressInput {
    return {
      label: faker.helpers.arrayElement(['Home', 'Work', 'Vacation']),
      name: faker.person.fullName(),
      line1: faker.location.streetAddress(),
      line2: undefined,
      city: faker.location.city(),
      postalCode: faker.location.zipCode('#####'),
      country: 'US',
      isDefault: false,
      ...overrides,
    };
  },
};
