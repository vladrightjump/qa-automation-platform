import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@qa/db';

@Injectable()
export class CartService {
  // Cart is 1:1 with User — upsert handles "create on demand".
  private findOrCreateCart(userId: string) {
    return prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
      include: {
        items: {
          include: { product: true },
          orderBy: [{ position: 'asc' }, { id: 'asc' }],
        },
      },
    });
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
