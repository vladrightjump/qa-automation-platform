import { Injectable } from '@nestjs/common';
import { prisma } from '@qa/db';
import type { Locale } from '@qa/contracts';

// AuditLog action emitted when a user changes their locale preference. The
// specs assert on this exact string.
export const LOCALE_CHANGED = 'LOCALE_CHANGED';

@Injectable()
export class MeService {
  /**
   * Persist the user's locale preference and leave a LOCALE_CHANGED audit row,
   * in one transaction. Returns the user's own profile.
   */
  async setLocale(userId: string, locale: Locale) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: { preferredLocale: locale },
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: LOCALE_CHANGED,
          entity: 'User',
          entityId: userId,
          metadata: { locale },
        },
      });
      return {
        id: user.id,
        email: user.email,
        role: user.role,
        preferredLocale: user.preferredLocale,
      };
    });
  }
}
