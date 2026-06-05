import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, prisma } from '@qa/db';

@Injectable()
export class CartService {
  // Cart is 1:1 with User — upsert handles "create on demand". Two
  // concurrent first-touch upserts on the same userId can both miss the
  // SELECT and race on the INSERT; the loser gets P2002, which means the
  // cart now exists and we can just re-fetch it. Real workload only hits
  // this on the very first request per user, but the race-conditions
  // spec drives 50 parallel addToCart on a fresh user and exposes it.
  private async findOrCreateCart(userId: string) {
    const include = {
      items: {
        include: { product: true },
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
      },
    } satisfies Prisma.CartInclude;
    try {
      return await prisma.cart.upsert({
        where: { userId },
        update: {},
        create: { userId },
        include,
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        const existing = await prisma.cart.findUnique({ where: { userId }, include });
        if (existing) return existing;
      }
      throw e;
    }
  }

  view(userId: string) {
    return this.findOrCreateCart(userId);
  }

  async addItem(userId: string, productId: string, quantity: number) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    const cart = await this.findOrCreateCart(userId);
    const max = await prisma.cartItem.aggregate({
      where: { cartId: cart.id },
      _max: { position: true },
    });
    await prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId } },
      update: { quantity: { increment: quantity } },
      create: {
        cartId: cart.id,
        productId,
        quantity,
        position: (max._max.position ?? 0) + 1,
      },
    });
    return this.findOrCreateCart(userId);
  }

  async updateItem(userId: string, productId: string, quantity: number) {
    const cart = await this.findOrCreateCart(userId);
    const item = await prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
    });
    if (!item) throw new NotFoundException(`Item ${productId} not in cart`);
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);
    const clamped = Math.max(1, Math.min(product.stock, quantity));
    await prisma.cartItem.update({
      where: { cartId_productId: { cartId: cart.id, productId } },
      data: { quantity: clamped },
    });
    return this.findOrCreateCart(userId);
  }

  async reorder(userId: string, order: string[]) {
    const cart = await this.findOrCreateCart(userId);
    const currentIds = cart.items.map((i) => i.productId);
    if (
      order.length !== currentIds.length ||
      !order.every((id) => currentIds.includes(id))
    ) {
      throw new BadRequestException(
        'reorder must contain exactly the products currently in the cart',
      );
    }
    await prisma.$transaction(
      order.map((productId, idx) =>
        prisma.cartItem.update({
          where: { cartId_productId: { cartId: cart.id, productId } },
          data: { position: idx + 1 },
        }),
      ),
    );
    return this.findOrCreateCart(userId);
  }

  async removeItem(userId: string, productId: string) {
    const cart = await this.findOrCreateCart(userId);
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id, productId },
    });
    return this.findOrCreateCart(userId);
  }
}
