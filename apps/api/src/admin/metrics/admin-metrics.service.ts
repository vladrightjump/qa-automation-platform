import { BadRequestException, Injectable } from '@nestjs/common';
import { prisma } from '@qa/db';
import type {
  ProductCategory,
  SalesMetrics,
  SalesMetricsCategory,
  SalesMetricsTopProduct,
} from '@qa/contracts';

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const TOP_PRODUCT_LIMIT = 10;

// Status set considered "revenue-bearing". CANCELLED + PENDING orders are
// excluded so the metric matches the admin-orders fulfilment view.
const REVENUE_STATUSES = ['PAID', 'FULFILLED'] as const;

interface CategoryRow {
  category: string;
  revenueCents: bigint;
  orderCount: bigint;
}

interface TopProductRow {
  productId: string;
  name: string;
  unitsSold: bigint;
  revenueCents: bigint;
}

interface TotalsRow {
  totalRevenueCents: bigint;
  orderCount: bigint;
}

@Injectable()
export class AdminMetricsService {
  /**
   * Single-query sales aggregation over Order × OrderItem × Product.
   * Rejects ranges where `from > to` or longer than a year.
   *
   * Performance: scales linearly with the number of order items in the
   * window. With the bulk-seed seam pushing the catalog past 1k products
   * and many orders, this is the perf-budget poster child for /admin/*.
   */
  async getSalesMetrics(fromIso?: string, toIso?: string): Promise<SalesMetrics> {
    const to = toIso ? new Date(toIso) : new Date();
    const from = fromIso
      ? new Date(fromIso)
      : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (from.getTime() > to.getTime()) {
      throw new BadRequestException('`from` must be <= `to`');
    }
    if (to.getTime() - from.getTime() > ONE_YEAR_MS) {
      throw new BadRequestException('Range must be 1 year or shorter');
    }

    const totalsRows = await prisma.$queryRaw<TotalsRow[]>`
      SELECT
        COALESCE(SUM(oi.quantity * oi."unitPriceCents"), 0)::bigint AS "totalRevenueCents",
        COUNT(DISTINCT o.id)::bigint                                AS "orderCount"
      FROM "Order" o
      JOIN "OrderItem" oi ON oi."orderId" = o.id
      WHERE o.status::text = ANY(${[...REVENUE_STATUSES]}::text[])
        AND o."createdAt" >= ${from}
        AND o."createdAt" <= ${to}
    `;

    const totals = totalsRows[0] ?? { totalRevenueCents: 0n, orderCount: 0n };
    const totalRevenueCents = Number(totals.totalRevenueCents);
    const orderCount = Number(totals.orderCount);
    const averageOrderValueCents =
      orderCount > 0 ? Math.floor(totalRevenueCents / orderCount) : 0;

    const byCategoryRows = await prisma.$queryRaw<CategoryRow[]>`
      SELECT
        p.category                                            AS category,
        COALESCE(SUM(oi.quantity * oi."unitPriceCents"), 0)::bigint AS "revenueCents",
        COUNT(DISTINCT o.id)::bigint                          AS "orderCount"
      FROM "Order" o
      JOIN "OrderItem" oi ON oi."orderId" = o.id
      JOIN "Product"   p  ON p.id          = oi."productId"
      WHERE o.status::text = ANY(${[...REVENUE_STATUSES]}::text[])
        AND o."createdAt" >= ${from}
        AND o."createdAt" <= ${to}
      GROUP BY p.category
      ORDER BY SUM(oi.quantity * oi."unitPriceCents") DESC
    `;

    const topProductRows = await prisma.$queryRaw<TopProductRow[]>`
      SELECT
        p.id                                                  AS "productId",
        p.name                                                AS name,
        SUM(oi.quantity)::bigint                              AS "unitsSold",
        SUM(oi.quantity * oi."unitPriceCents")::bigint        AS "revenueCents"
      FROM "Order" o
      JOIN "OrderItem" oi ON oi."orderId" = o.id
      JOIN "Product"   p  ON p.id          = oi."productId"
      WHERE o.status::text = ANY(${[...REVENUE_STATUSES]}::text[])
        AND o."createdAt" >= ${from}
        AND o."createdAt" <= ${to}
      GROUP BY p.id, p.name
      ORDER BY SUM(oi.quantity * oi."unitPriceCents") DESC, p.id ASC
      LIMIT ${TOP_PRODUCT_LIMIT}
    `;

    const byCategory: SalesMetricsCategory[] = byCategoryRows.map((row) => ({
      category: row.category as ProductCategory,
      revenueCents: Number(row.revenueCents),
      orderCount: Number(row.orderCount),
    }));

    const topProducts: SalesMetricsTopProduct[] = topProductRows.map((row) => ({
      productId: row.productId,
      name: row.name,
      unitsSold: Number(row.unitsSold),
      revenueCents: Number(row.revenueCents),
    }));

    return {
      totalRevenueCents,
      orderCount,
      averageOrderValueCents,
      byCategory,
      topProducts,
      range: { fromIso: from.toISOString(), toIso: to.toISOString() },
    };
  }
}
