// Unit tests for OrdersService orchestration. The arithmetic
// (computeDiscount, earnedPoints, clampRedemption) is property-tested
// in `@qa/contracts`; here we exercise checkout's branching: cart
// empty, stock guard, address ownership, paymentMethod default, the
// conditional collaborator calls (recordRedemption / recordRedeem /
// recordEarn fire only when their precondition holds), and the
// get/cancel guards.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDeep, mockReset, type DeepMockProxy } from 'vitest-mock-extended';
import type { Prisma, PrismaClient } from '@qa/db';

const prismaMock = mockDeep<PrismaClient>();
vi.mock('@qa/db', () => ({
  prisma: prismaMock,
  OrderStatus: { PENDING: 'PENDING', PAID: 'PAID', FULFILLED: 'FULFILLED', CANCELLED: 'CANCELLED' },
  Prisma: { JsonNull: null },
}));
vi.mock('../test/fault-injection', () => ({
  maybeInjectFailure: vi.fn(),
}));

const { OrdersService } = await import('./orders.service');
const { BadRequestException, ForbiddenException, NotFoundException } = await import('@nestjs/common');

type CartItem = {
  productId: string;
  quantity: number;
  product: { id: string; priceCents: number; stock: number };
};
type Cart = { id: string; userId: string; items: CartItem[] };

const cartWith = (items: CartItem[]): Cart => ({ id: 'c_1', userId: 'u_1', items });

const item = (productId: string, priceCents: number, quantity: number, stock: number): CartItem => ({
  productId,
  quantity,
  product: { id: productId, priceCents, stock },
});

// Minimal fakes for the two service collaborators — only the methods
// OrdersService calls.
const makePromoStub = () => ({
  previewPromo: vi.fn(),
  recordRedemption: vi.fn(),
});
const makeLoyaltyStub = () => ({
  prepareRedemption: vi.fn().mockResolvedValue(0),
  earnedPoints: vi.fn().mockReturnValue(0),
  recordRedeem: vi.fn(),
  recordEarn: vi.fn(),
});

// Wire up a transaction client that records the conditional calls.
const wireTx = (mock: DeepMockProxy<PrismaClient>) => {
  const tx = mockDeep<Prisma.TransactionClient>();
  (tx.product.updateMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 } as never);
  (tx.order.create as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'o_1', items: [] } as never);
  (tx.auditLog.create as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({} as never);
  (tx.cartItem.deleteMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 } as never);
  (mock.$transaction as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    async (fn: (tx: unknown) => Promise<unknown>) => fn(tx),
  );
  return tx;
};

describe('OrdersService', () => {
  let promo: ReturnType<typeof makePromoStub>;
  let loyalty: ReturnType<typeof makeLoyaltyStub>;
  let service: InstanceType<typeof OrdersService>;

  beforeEach(() => {
    mockReset(prismaMock);
    promo = makePromoStub();
    loyalty = makeLoyaltyStub();
    service = new OrdersService(promo as never, loyalty as never);
  });

  describe('checkout', () => {
    const setCart = (cart: Cart | null) =>
      (prismaMock.cart.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(cart as never);

    it('throws 400 when the cart is missing', async () => {
      setCart(null);
      await expect(service.checkout('u_1')).rejects.toThrow(/cart is empty/i);
    });

    it('throws 400 when the cart has no items', async () => {
      setCart(cartWith([]));
      await expect(service.checkout('u_1')).rejects.toThrow(/cart is empty/i);
    });

    it('throws 400 when any item exceeds stock', async () => {
      setCart(cartWith([item('p_1', 1_000, 5, 2)]));
      await expect(service.checkout('u_1')).rejects.toThrow(/insufficient stock/i);
    });

    it('throws 400 when addressId is not owned by the user', async () => {
      setCart(cartWith([item('p_1', 1_000, 1, 5)]));
      (prismaMock.address.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'a_1',
        userId: 'other_user',
      } as never);
      await expect(
        service.checkout('u_1', { addressId: 'a_1', paymentMethod: 'CARD' }),
      ).rejects.toThrow(/invalid addressid/i);
    });

    it('defaults paymentMethod to CARD when not supplied', async () => {
      setCart(cartWith([item('p_1', 1_000, 1, 5)]));
      const tx = wireTx(prismaMock);
      await service.checkout('u_1');
      const createCall = (tx.order.create as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as { data: { paymentMethod: string } };
      expect(createCall.data.paymentMethod).toBe('CARD');
    });

    it('uses the discount returned by PromoService when a promoCode is supplied', async () => {
      setCart(cartWith([item('p_1', 2_000, 1, 5)]));
      promo.previewPromo.mockResolvedValueOnce({ code: 'X', discountCents: 200, promoCodeId: 'p_x' });
      const tx = wireTx(prismaMock);

      await service.checkout('u_1', { promoCode: 'X' });
      const createCall = (tx.order.create as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as {
        data: { discountCents: number; totalCents: number; promoCodeId: string };
      };
      expect(createCall.data.discountCents).toBe(200);
      expect(createCall.data.totalCents).toBe(1_800);
      expect(createCall.data.promoCodeId).toBe('p_x');
      expect(promo.recordRedemption).toHaveBeenCalledOnce();
    });

    it('skips PromoService.recordRedemption when no promoCode is supplied', async () => {
      setCart(cartWith([item('p_1', 1_000, 1, 5)]));
      wireTx(prismaMock);
      await service.checkout('u_1');
      expect(promo.previewPromo).not.toHaveBeenCalled();
      expect(promo.recordRedemption).not.toHaveBeenCalled();
    });

    it('records a loyalty REDEEM ledger row only when prepareRedemption returns > 0', async () => {
      setCart(cartWith([item('p_1', 5_000, 1, 5)]));
      loyalty.prepareRedemption.mockResolvedValueOnce(1_000);
      const tx = wireTx(prismaMock);

      await service.checkout('u_1', { redeemPoints: 1_000 });
      expect(loyalty.recordRedeem).toHaveBeenCalledOnce();
      const createCall = (tx.order.create as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as {
        data: { totalCents: number };
      };
      expect(createCall.data.totalCents).toBe(4_000);
    });

    it('skips loyalty REDEEM when prepareRedemption returns 0', async () => {
      setCart(cartWith([item('p_1', 1_000, 1, 5)]));
      loyalty.prepareRedemption.mockResolvedValueOnce(0);
      wireTx(prismaMock);
      await service.checkout('u_1');
      expect(loyalty.recordRedeem).not.toHaveBeenCalled();
    });

    it('records a loyalty EARN ledger row only when earnedPoints > 0', async () => {
      setCart(cartWith([item('p_1', 2_000, 1, 5)]));
      loyalty.earnedPoints.mockReturnValueOnce(100);
      wireTx(prismaMock);
      await service.checkout('u_1');
      expect(loyalty.recordEarn).toHaveBeenCalledOnce();
    });

    it('skips EARN when earnedPoints returns 0 (e.g. fully covered by redemption)', async () => {
      setCart(cartWith([item('p_1', 2_000, 1, 5)]));
      loyalty.earnedPoints.mockReturnValueOnce(0);
      wireTx(prismaMock);
      await service.checkout('u_1');
      expect(loyalty.recordEarn).not.toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('throws 404 when the order is missing', async () => {
      (prismaMock.order.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
      await expect(service.get('u_1', 'o_x')).rejects.toThrow(NotFoundException);
    });

    it('throws 403 when the order belongs to another user', async () => {
      (prismaMock.order.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'o_1',
        userId: 'someone_else',
      } as never);
      await expect(service.get('u_1', 'o_1')).rejects.toThrow(ForbiddenException);
    });

    it('returns the order when the owner asks for it', async () => {
      const order = { id: 'o_1', userId: 'u_1', items: [], returns: [] };
      (prismaMock.order.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(order as never);
      await expect(service.get('u_1', 'o_1')).resolves.toBe(order);
    });
  });

  describe('cancel', () => {
    it('rejects with 400 when the order is already FULFILLED', async () => {
      const order = { id: 'o_1', userId: 'u_1', status: 'FULFILLED', items: [], returns: [] };
      (prismaMock.order.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(order as never);
      await expect(service.cancel('u_1', 'o_1')).rejects.toThrow(BadRequestException);
    });

    it('transitions a PAID order to CANCELLED and writes the audit row', async () => {
      const order = { id: 'o_1', userId: 'u_1', status: 'PAID', items: [], returns: [] };
      (prismaMock.order.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(order as never);
      const tx = wireTx(prismaMock);
      (tx.order.update as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'o_1',
        status: 'CANCELLED',
        items: [],
      } as never);
      await service.cancel('u_1', 'o_1');
      expect(tx.order.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'CANCELLED' } }),
      );
      expect(tx.auditLog.create).toHaveBeenCalled();
    });
  });
});
