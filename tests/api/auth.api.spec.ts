import { test, expect } from '../fixtures';
import { UserFactory } from '../factories/user.factory';
import { AuthResultSchema } from '@qa/contracts';
import { API_BASE } from '../support/api-client';

test.describe('auth', () => {
  test('@smoke register issues a token + Zod-conformant user', async ({ api }) => {
    const creds = UserFactory.build();
    const result = await api.register(creds.email, creds.password);
    expect(AuthResultSchema.safeParse(result).success).toBe(true);
    expect(result.user.email).toBe(creds.email);
    expect(result.token.length).toBeGreaterThan(20);
  });

  test('@smoke login round-trips the same credentials', async ({ api, testUser }) => {
    const result = await api.login(testUser.email, testUser.password);
    expect(result.user.id).toBe(testUser.id);
    expect(result.token.length).toBeGreaterThan(20);
  });

  test('@regression register rejects duplicate email with 409', async ({ api, testUser }) => {
    const res = await api.raw().post(`${API_BASE}/auth/register`, {
      data: { email: testUser.email, password: 'newpassword12345' },
    });
    expect(res.status()).toBe(409);
  });

  test('@regression register rejects invalid email + short password with 400', async ({ api }) => {
    const res = await api.raw().post(`${API_BASE}/auth/register`, {
      data: { email: 'not-an-email', password: 'short' },
    });
    expect(res.status()).toBe(400);
  });

  test('@regression login rejects wrong password with 401', async ({ api, testUser }) => {
    const res = await api.raw().post(`${API_BASE}/auth/login`, {
      data: { email: testUser.email, password: 'wrong-password-999' },
    });
    expect(res.status()).toBe(401);
  });
});
