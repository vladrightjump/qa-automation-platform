import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@qa/db';

@Injectable()
export class CartService {
  // Cart is 1:1 with User — upsert handles "create on demand".
  private findOrCreateCart(userId: string) {
    return prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
      include: { items: { include: { product: true } } },
    });
  }

  view(userId: string) {
    return this.findOrCreateCart(userId);
  }

  async addItem(userId: string, productId: string, quantity: number) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    const cart = await this.findOrCreateCart(userId);
    await prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId } },
      update: { quantity: { increment: quantity } },
      create: { cartId: cart.id, productId, quantity },
    });
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
