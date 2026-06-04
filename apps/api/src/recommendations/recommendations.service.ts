import { Injectable } from '@nestjs/common';
import { prisma } from '@qa/db';
import type { Product as PrismaProduct } from '@qa/db';
import {
  MAX_RECOMMENDATIONS,
  SCORE,
  compareRecommendations,
} from '@qa/contracts';
import type {
  Product,
  Recommendation,
  RecommendationKind,
} from '@qa/contracts';

interface CoOccurrenceRow {
  productBId: string;
  coOccurrenceCount: number;
}

function toProduct(row: PrismaProduct): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    priceCents: row.priceCents,
    stock: row.stock,
    category: row.category as Product['category'],
    tags: row.tags,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class RecommendationsService {
  /**
   * Unions three signals into a single ranked list, deduped by productId:
   *   collaborative   — top co-occurrences from RecommendationView for
   *                     the user's purchased products. Highest score.
   *   same-category   — products in the categories of the user's most
   *                     recent paid/fulfilled order.
   *   recently-viewed — products in the same categories as IDs from the
   *                     X-Recently-Viewed header.
   * Caps at 12 items. Order is deterministic per (user, header) so tests
   * can pin top-N.
   */
  async getForUser(
    userId: string,
    recentlyViewedHeader: string | undefined,
  ): Promise<Recommendation[]> {
    const recentlyViewedIds = parseHeader(recentlyViewedHeader);

    const recentOrder = await prisma.order.findFirst({
      where: { userId, status: { in: ['PAID', 'FULFILLED'] } },
      orderBy: { createdAt: 'desc' },
      include: { items: { include: { product: true } } },
    });

    const purchasedIds = recentOrder?.items.map((i) => i.productId) ?? [];
    const seenIds = new Set<string>([...purchasedIds, ...recentlyViewedIds]);

    const out: Recommendation[] = [];

    // 1) Collaborative — pulls top co-occurrences for the user's purchases.
    if (purchasedIds.length > 0) {
      const rows = await prisma.$queryRaw<CoOccurrenceRow[]>`
        SELECT "productBId", sum("coOccurrenceCount")::int AS "coOccurrenceCount"
        FROM "RecommendationView"
        WHERE "productAId" = ANY(${purchasedIds}::text[])
          AND "productBId" <> ALL(${purchasedIds}::text[])
        GROUP BY "productBId"
        ORDER BY sum("coOccurrenceCount") DESC, "productBId" ASC
        LIMIT ${MAX_RECOMMENDATIONS}
      `;
      const productIds = rows.map((r) => r.productBId);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
      });
      const byId = new Map(products.map((p) => [p.id, p]));
      for (const row of rows) {
        const product = byId.get(row.productBId);
        if (!product || seenIds.has(product.id)) continue;
        out.push({
          kind: 'collaborative',
          product: toProduct(product),
          score: SCORE.collaborative(row.coOccurrenceCount),
          reason: `Bought together ${row.coOccurrenceCount}× with your purchases`,
        });
        seenIds.add(product.id);
      }
    }

    // 2) Same-category — most recent order's categories.
    if (recentOrder && out.length < MAX_RECOMMENDATIONS) {
      const categories = Array.from(
        new Set(recentOrder.items.map((i) => i.product.category)),
      );
      if (categories.length > 0) {
        const products = await prisma.product.findMany({
          where: {
            category: { in: categories },
            id: { notIn: Array.from(seenIds) },
          },
          orderBy: { createdAt: 'desc' },
          take: MAX_RECOMMENDATIONS - out.length,
        });
        products.forEach((p, idx) => {
          out.push({
            kind: 'same-category',
            product: toProduct(p),
            score: SCORE.sameCategory(idx),
            reason: `More from ${p.category}`,
          });
          seenIds.add(p.id);
        });
      }
    }

    // 3) Recently-viewed — same-category products for header-supplied IDs.
    if (recentlyViewedIds.length > 0 && out.length < MAX_RECOMMENDATIONS) {
      const seeds = await prisma.product.findMany({
        where: { id: { in: recentlyViewedIds } },
        select: { id: true, category: true },
      });
      const categories = Array.from(new Set(seeds.map((s) => s.category)));
      if (categories.length > 0) {
        const products = await prisma.product.findMany({
          where: {
            category: { in: categories },
            id: { notIn: Array.from(seenIds) },
          },
          orderBy: { createdAt: 'desc' },
          take: MAX_RECOMMENDATIONS - out.length,
        });
        products.forEach((p, idx) => {
          out.push({
            kind: 'recently-viewed' satisfies RecommendationKind,
            product: toProduct(p),
            score: SCORE.recentlyViewed(idx),
            reason: 'Because you viewed similar items',
          });
          seenIds.add(p.id);
        });
      }
    }

    return out.sort(compareRecommendations).slice(0, MAX_RECOMMENDATIONS);
  }
}

function parseHeader(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length <= 64)
    .slice(0, 32);
}
