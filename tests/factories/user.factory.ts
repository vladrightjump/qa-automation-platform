import { faker } from '@faker-js/faker';

export interface UserCredentials {
  email: string;
  password: string;
}

/**
 * Faker-backed builder for fresh, valid user credentials. Each call produces
 * a unique email so tests can run in parallel without colliding on the
 * `User.email` unique index.
 */
export const UserFactory = {
  build(overrides: Partial<UserCredentials> = {}): UserCredentials {
    return {
      email: faker.internet
        .email({ provider: 'qa-test.local' })
        .toLowerCase(),
      password: faker.internet.password({ length: 12 }),
      ...overrides,
    };
  },
};
