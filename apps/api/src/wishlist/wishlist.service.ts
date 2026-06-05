import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, prisma } from '@qa/db';

@Injectable()
export class WishlistService {
  // Wishlist is 1:1 with User. Two concurrent first-touch upserts on the
  // same userId can both miss the SELECT and race on the INSERT; the loser
  // gets P2002, which means the row now exists and we can re-fetch.
  private async findOrCreate(userId: string) {
    try {
      return await prisma.wishlist.upsert({
        where: { userId },
        update: {},
        create: { userId },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        const existing = await prisma.wishlist.findUnique({ where: { userId } });
        if (existing) return existing;
      }
      throw e;
    }
  }

  async get(userId: string) {
    const wishlist = await this.findOrCreate(userId);
    return prisma.wishlist.findUnique({
      where: { id: wishlist.id },
      include: { items: { include: { product: true }, orderBy: { createdAt: 'desc' } } },
    });
  }

  async add(userId: string, productId: string) {
    const wishlist = await this.findOrCreate(userId);
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);
    try {
      await prisma.wishlistItem.create({
        data: { wishlistId: wishlist.id, productId },
      });
    } catch (e) {
      // P2002 unique violation → item already in wishlist (no-op)
      if (
        !(
          e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002'
        )
      ) {
        throw e;
      }
    }
    return this.get(userId);
  }

  async remove(userId: string, productId: string) {
    const wishlist = await this.findOrCreate(userId);
    await prisma.wishlistItem.deleteMany({
      where: { wishlistId: wishlist.id, productId },
    });
    return this.get(userId);
  }
}
