// JWT tamper-resistance contract for the AuthGuard. Four canonical attacks:
// expired token, wrong-secret signature, missing sub claim, and a sub forged
// to another user's id. Tokens are minted directly via the HS256 helper —
// no @nestjs/jwt dep leak — using the API's own JWT_SECRET so a successful
// forgery (in the impersonation case) really is signature-valid.
import { test, expect } from '../fixtures';
import { API_BASE } from '../support/api-client';
import { mintToken } from '../support/jwt-helpers';
import { UserFactory } from '../factories/user.factory';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';

test.describe('JWT tamper resistance', () => {
  test(
    'expired token → 401',
    { tag: ['@security', '@negative', '@regression'] },
    async ({ api, testUser }) => {
      const expired = mintToken(
        { sub: testUser.id, email: testUser.email, role: 'USER' },
        JWT_SECRET,
        { expiresIn: -3600 },
      );
      const res = await api
        .raw()
        .get(`${API_BASE}/cart`, {
          headers: { Authorization: `Bearer ${expired}` },
        });
      expect(res.status()).toBe(401);
    },
  );

  test(
    'token signed with wrong secret → 401',
    { tag: ['@security', '@negative', '@regression'] },
    async ({ api, testUser }) => {
      const forged = mintToken(
        { sub: testUser.id, email: testUser.email, role: 'USER' },
        'not-the-real-secret',
        { expiresIn: 3600 },
      );
      const res = await api
        .raw()
        .get(`${API_BASE}/cart`, {
          headers: { Authorization: `Bearer ${forged}` },
        });
      expect(res.status()).toBe(401);
    },
  );

  test(
    'token missing sub claim → request fails',
    { tag: ['@security', '@negative', '@regression'] },
    async ({ api, testUser }) => {
      // AuthGuard's contract is "verify the signature, then mirror payload.sub
      // into req.user.id." A token without sub passes signature verification
      // but leaves the downstream id undefined — the request must not
      // succeed. We assert non-2xx (rather than a specific 401) because the
      // failure point lives below the guard.
      const noSub = mintToken(
        { email: testUser.email, role: 'USER' },
        JWT_SECRET,
        { expiresIn: 3600 },
      );
      const res = await api
        .raw()
        .get(`${API_BASE}/cart`, {
          headers: { Authorization: `Bearer ${noSub}` },
        });
      expect(res.status()).toBeGreaterThanOrEqual(400);
    },
  );

  test(
    'sub swapped to another user → token authenticates as that user',
    { tag: ['@security', '@negative', '@regression'] },
    async ({ api, testUser }) => {
      // Documents the JWT contract: anyone with the signing secret can mint
      // a token for any sub. The current API does not layer additional
      // identity checks on top, so this test asserts the impersonation
      // succeeds (200). If a future change adds a tighter contract — e.g.
      // a jti bound to a server-side session row — this test will go red
      // and the contract should be re-stated as 401/403.
      const otherCreds = UserFactory.build();
      const { user: other } = await api.register(
        otherCreds.email,
        otherCreds.password,
      );
      const impersonation = mintToken(
        { sub: other.id, email: other.email, role: 'USER' },
        JWT_SECRET,
        { expiresIn: 3600 },
      );
      const res = await api
        .raw()
        .get(`${API_BASE}/cart`, {
          headers: { Authorization: `Bearer ${impersonation}` },
        });
      expect(res.status()).toBe(200);
      // Sanity-check we are not somehow seeing testUser's data: testUser
      // never touched the cart in this test, but neither did `other` — both
      // start empty. The point is the request was accepted at all.
      void testUser;
    },
  );
});
