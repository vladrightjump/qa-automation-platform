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
