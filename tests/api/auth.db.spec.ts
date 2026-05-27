import { test, expect } from '../fixtures';
import { UserFactory } from '../factories/user.factory';

test.describe('auth side-effects (DB layer)', () => {
  test('@regression register stores user with a bcrypt hash (never plaintext)', async ({
    api,
    db,
  }) => {
    const creds = UserFactory.build();
    await api.register(creds.email, creds.password);

    const dbUser = await db.user.findUniqueOrThrow({
      where: { email: creds.email },
    });
    expect(dbUser.password).not.toBe(creds.password);
    // bcryptjs hashes start with one of $2a$ / $2b$ / $2y$.
    expect(dbUser.password).toMatch(/^\$2[ayb]\$/);
  });
});
