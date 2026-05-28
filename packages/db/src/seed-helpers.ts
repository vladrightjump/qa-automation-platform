import * as bcrypt from 'bcryptjs';
import type { PrismaClient } from '@prisma/client';

// Deterministic admin used by admin/* e2e and api tests.
export const ADMIN_EMAIL = 'admin@example.com';
export const ADMIN_PASSWORD = 'Admin123!';
const ADMIN_HASH = bcrypt.hashSync(ADMIN_PASSWORD, 10);

export async function upsertAdmin(client: PrismaClient): Promise<void> {
  await client.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { role: 'ADMIN', password: ADMIN_HASH },
    create: { email: ADMIN_EMAIL, password: ADMIN_HASH, role: 'ADMIN' },
  });
}

// Deterministic promo codes used by checkout/promo tests.
export const PROMO_CODES = {
  welcome10: {
    code: 'WELCOME10',
    percentOff: 10,
    flatOffCents: null,
    active: true,
    expiresAt: null,
  },
  freeship: {
    code: 'FREESHIP',
    percentOff: null,
    flatOffCents: 500,
    active: true,
    expiresAt: null,
  },
  expired: {
    code: 'OLDDEAL',
    percentOff: 50,
    flatOffCents: null,
    active: true,
    expiresAt: new Date('2024-01-01T00:00:00Z'),
  },
} as const;

export async function upsertPromoCodes(client: PrismaClient): Promise<void> {
  for (const promo of Object.values(PROMO_CODES)) {
    await client.promoCode.upsert({
      where: { code: promo.code },
      update: {
        percentOff: promo.percentOff,
        flatOffCents: promo.flatOffCents,
        active: promo.active,
        expiresAt: promo.expiresAt,
      },
      create: {
        code: promo.code,
        percentOff: promo.percentOff,
        flatOffCents: promo.flatOffCents,
        active: promo.active,
        expiresAt: promo.expiresAt,
      },
    });
  }
}
