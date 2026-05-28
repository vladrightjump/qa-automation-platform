// Singleton PrismaClient — re-used by the API and the test suite so they
// observe the exact same connection pool and types.
import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __qa_prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis.__qa_prisma ?? new PrismaClient({ log: ['warn', 'error'] });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__qa_prisma = prisma;
}

// Re-export Prisma types so consumers can import directly from `@qa/db`.
export * from '@prisma/client';
export * from './seed-helpers';
