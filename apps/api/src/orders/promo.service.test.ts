// Unit tests for PromoService branch behaviour. Discount arithmetic
// itself lives in `@qa/contracts/promo-math` and is property-tested
// there; here we exercise the orchestration: code lookup, the four
// rejection branches (missing/inactive/expired/cap), minSpend guard,
// the listPromoCodes filter shape, and the atomic recordRedemption
// conditional UPDATE.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import type { Prisma, PrismaClient } from '@qa/db';

const prismaMock = mockDeep<PrismaClient>();
vi.mock('@qa/db', () => ({ prisma: prismaMock, Prisma: { JsonNull: null } }));

const { PromoService } = await import('./promo.service');
const { BadRequestException, NotFoundException } = await import('@nestjs/common');

type PromoRow = {
  id: string;
  code: string;
  description: string | null;
  percentOff: number | null;
  flatOffCents: number | null;
  minSpendCents: number;
  featured: boolean;
  maxRedemptions: number | null;
  timesRedeemed: number;
  active: boolean;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const basePromo = (overrides: Partial<PromoRow> = {}): PromoRow => ({
  id: 'p_1',
  code: 'DEAL10',
  description: null,
  percentOff: 10,
  flatOffCents: null,
  minSpendCents: 0,
  featured: true,
  maxRedemptions: null,
  timesRedeemed: 0,
  active: true,
  expiresAt: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

const cartWith = (priceCents: number, quantity: number) => ({
  id: 'c_1',
  userId: 'u_1',
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [
    {
      id: 'ci_1',
      cartId: 'c_1',
      productId: 'pr_1',
      quantity,
      position: 1,
      product: { id: 'pr_1', priceCents, stock: 99, name: 'x', description: '', category: 'misc', tags: [], createdAt: new Date(), updatedAt: new Date() },
    },
  ],
});

describe('PromoService', () => {
  let service: InstanceType<typeof PromoService>;

  beforeEach(() => {
    mockReset(prismaMock);
    service = new PromoService();
  });

  describe('previewPromo', () => {
    const mockPromo = (row: PromoRow | null) =>
      (prismaMock.promoCode.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(row as never);
    const mockCart = (cart: ReturnType<typeof cartWith> | null) =>
      (prismaMock.cart.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(cart as never);

    it('throws 404 when the code is unknown', async () => {
      mockPromo(null);
      await expect(service.previewPromo('u_1', 'GHOST')).rejects.toThrow(NotFoundException);
    });

    it('uppercases + trims the input before lookup', async () => {
      mockPromo(null);
      await expect(service.previewPromo('u_1', '  deal10 ')).rejects.toThrow(NotFoundException);
      expect(prismaMock.promoCode.findUnique).toHaveBeenCalledWith({ where: { code: 'DEAL10' } });
    });

    it('throws 400 when the code is inactive', async () => {
      mockPromo(basePromo({ active: false }));
      await expect(service.previewPromo('u_1', 'DEAL10')).rejects.toThrow(/inactive/i);
    });

    it('throws 400 when the code is expired', async () => {
      mockPromo(basePromo({ expiresAt: new Date(Date.now() - 1_000) }));
      await expect(service.previewPromo('u_1', 'DEAL10')).rejects.toThrow(/expired/i);
    });

    it('throws 400 when the cap has been reached', async () => {
      mockPromo(basePromo({ maxRedemptions: 2, timesRedeemed: 2 }));
      await expect(service.previewPromo('u_1', 'DEAL10')).rejects.toThrow(/fully redeemed/i);
    });

    it('throws 400 when the cart is empty', async () => {
      mockPromo(basePromo());
      mockCart(null);
      await expect(service.previewPromo('u_1', 'DEAL10')).rejects.toThrow(/cart is empty/i);
    });

    it('throws 400 when the subtotal is below minSpend', async () => {
      mockPromo(basePromo({ minSpendCents: 5_000 }));
      mockCart(cartWith(1_000, 1));
      await expect(service.previewPromo('u_1', 'DEAL10')).rejects.toThrow(/minimum spend/i);
    });

    it('returns the computed discount for a valid percentOff code (10% of 2000¢ = 200¢)', async () => {
      mockPromo(basePromo({ percentOff: 10 }));
      mockCart(cartWith(1_000, 2));
      await expect(service.previewPromo('u_1', 'DEAL10')).resolves.toEqual({
        code: 'DEAL10',
        discountCents: 200,
        promoCodeId: 'p_1',
      });
    });

    it('returns the computed discount for a flatOff code (capped at subtotal)', async () => {
      mockPromo(basePromo({ percentOff: null, flatOffCents: 9_999 }));
      mockCart(cartWith(1_000, 1));
      await expect(service.previewPromo('u_1', 'DEAL10')).resolves.toMatchObject({
        // flatOff > subtotal → clamped to subtotal (1000¢) per promo-math.
        discountCents: 1_000,
      });
    });

    it('an unexpired future expiresAt is accepted', async () => {
      mockPromo(basePromo({ expiresAt: new Date(Date.now() + 60_000) }));
      mockCart(cartWith(1_000, 1));
      await expect(service.previewPromo('u_1', 'DEAL10')).resolves.toMatchObject({ code: 'DEAL10' });
    });
  });

  describe('listPromoCodes', () => {
    it('filters out cap-exhausted codes and strips internal fields', async () => {
      (prismaMock.promoCode.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        basePromo({ id: 'p_1', code: 'A', featured: true, maxRedemptions: null }),
        basePromo({ id: 'p_2', code: 'B', featured: true, maxRedemptions: 1, timesRedeemed: 1 }),
        basePromo({ id: 'p_3', code: 'C', featured: true, maxRedemptions: 2, timesRedeemed: 1 }),
      ] as never);

      const result = await service.listPromoCodes();
      expect(result.map((p) => p.code)).toEqual(['A', 'C']);
      for (const p of result) {
        expect(p).not.toHaveProperty('timesRedeemed');
        expect(p).not.toHaveProperty('maxRedemptions');
        expect(p).not.toHaveProperty('id');
      }
      expect(prismaMock.promoCode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ featured: true, active: true }) }),
      );
    });
  });

  describe('recordRedemption', () => {
    const txMock = {
      $executeRaw: vi.fn(),
      auditLog: { create: vi.fn() },
    };

    beforeEach(() => {
      txMock.$executeRaw.mockReset();
      txMock.auditLog.create.mockReset();
    });

    it('writes the audit row when the conditional UPDATE hits one row', async () => {
      txMock.$executeRaw.mockResolvedValueOnce(1);
      txMock.auditLog.create.mockResolvedValueOnce({} as never);
      await service.recordRedemption(
        txMock as unknown as Prisma.TransactionClient,
        'u_1',
        { code: 'DEAL10', discountCents: 200, promoCodeId: 'p_1' },
        'o_1',
      );
      expect(txMock.auditLog.create).toHaveBeenCalledOnce();
    });

    it('throws "fully redeemed" when the conditional UPDATE matched zero rows', async () => {
      txMock.$executeRaw.mockResolvedValueOnce(0);
      await expect(
        service.recordRedemption(
          txMock as unknown as Prisma.TransactionClient,
          'u_1',
          { code: 'LAST', discountCents: 100, promoCodeId: 'p_1' },
          'o_1',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(txMock.auditLog.create).not.toHaveBeenCalled();
    });
  });
});
