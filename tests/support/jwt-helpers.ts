// Hand-rolled HS256 JWT minter used by tamper-resistance specs. Going via
// Node's built-in `crypto` keeps the tests workspace free of a runtime JWT
// dep — the API uses @nestjs/jwt (which pulls jsonwebtoken transitively),
// but that pulls in @nestjs/common via Jwt​Service, and we don't want any of
// it in the test container.
//
// HS256 only — that's what the API uses (JwtModule.register with a string
// secret). If the API ever moves to RS256, this helper should too.
import { createHmac } from 'node:crypto';

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export interface MintOptions {
  // Seconds from now. Negative values produce already-expired tokens, which
  // is exactly what the expiry-rejection test needs.
  expiresIn?: number;
}

export function mintToken(
  payload: Record<string, unknown>,
  secret: string,
  opts: MintOptions = {},
): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: Record<string, unknown> = { iat: now, ...payload };
  if (opts.expiresIn !== undefined) fullPayload.exp = now + opts.expiresIn;

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(fullPayload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = base64url(
    createHmac('sha256', secret).update(signingInput).digest(),
  );
  return `${signingInput}.${signature}`;
}
