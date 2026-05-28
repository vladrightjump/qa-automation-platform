import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, prisma } from '@qa/db';
import type { CreateReviewDto, ListReviewsDto, ReviewSort } from './dto';

const ORDER_BY: Record<ReviewSort, Prisma.ReviewOrderByWithRelationInput> = {
  newest: { createdAt: 'desc' },
  highest: { rating: 'desc' },
  lowest: { rating: 'asc' },
};

@Injectable()
export class ReviewsService {
  async list(productId: string, query: ListReviewsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const sort = query.sort ?? 'newest';
    const [items, total, agg] = await Promise.all([
      prisma.review.findMany({
        where: { productId },
        orderBy: ORDER_BY[sort],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.review.count({ where: { productId } }),
      prisma.review.aggregate({
        where: { productId },
        _avg: { rating: true },
      }),
    ]);
    return {
      items,
      total,
      page,
      pageSize,
      averageRating: agg._avg.rating ?? 0,
    };
  }

  async summary(productId: string) {
    const [count, agg] = await Promise.all([
      prisma.review.count({ where: { productId } }),
      prisma.review.aggregate({
        where: { productId },
        _avg: { rating: true },
      }),
    ]);
    return { reviewCount: count, averageRating: agg._avg.rating ?? 0 };
  }

  async create(userId: string, productId: string, dto: CreateReviewDto) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);
    try {
      return await prisma.review.create({
        data: {
          productId,
          userId,
          rating: dto.rating,
          title: dto.title,
          body: dto.body,
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          `You have already reviewed ${productId}`,
        );
      }
      throw e;
    }
  }

  async remove(userId: string, id: string) {
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException(`Review ${id} not found`);
    if (review.userId !== userId) throw new ForbiddenException();
    await prisma.review.delete({ where: { id } });
    return { ok: true };
  }
}
