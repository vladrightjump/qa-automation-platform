import { Injectable } from '@nestjs/common';
import { prisma } from '@qa/db';
import type {
  PagedSearch,
  ProductSearchResult,
  Suggestion,
} from '@qa/contracts';

// Row shape returned by the raw FTS query. Keeping it close to the
// Product schema so the service can hand the mapper a near-identity copy.
interface SearchRow {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  stock: number;
  category: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  rank: number;
  name_headline: string;
  description_headline: string | null;
}

function toResult(row: SearchRow): ProductSearchResult {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    priceCents: row.priceCents,
    stock: row.stock,
    category: row.category as ProductSearchResult['category'],
    tags: row.tags,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    score: Number(row.rank),
    highlights: {
      name: row.name_headline ? row.name_headline : null,
      description: row.description_headline,
    },
  };
}

@Injectable()
export class SearchService {
  /**
   * Full-text search over Product.searchVector. Ranking via ts_rank_cd
   * (B normalises by document length), tie-broken by name asc for
   * determinism — the test suite asserts on relative order.
   *
   * Headlines are produced with ts_headline so the UI can highlight the
   * matched tokens; tests treat them as opaque non-empty strings.
   */
  async search(q: string, page: number, pageSize: number): Promise<PagedSearch> {
    const offset = (page - 1) * pageSize;
    const startedAt = Date.now();

    // plainto_tsquery handles user input safely — it disables the operator
    // syntax (& | !) so search strings can't crash with an "invalid tsquery".
    const rows = await prisma.$queryRaw<SearchRow[]>`
      SELECT
        id, name, description, "priceCents", stock, category, tags,
        "createdAt", "updatedAt",
        ts_rank_cd("searchVector", q.query, 32) AS rank,
        ts_headline('simple', name,
                    q.query, 'StartSel=<mark>,StopSel=</mark>,HighlightAll=TRUE') AS name_headline,
        ts_headline('simple', coalesce(description, ''),
                    q.query, 'StartSel=<mark>,StopSel=</mark>,MaxFragments=1,MaxWords=12,MinWords=3')
          AS description_headline
      FROM "Product", plainto_tsquery('simple', ${q}) AS q(query)
      WHERE "searchVector" @@ q.query
      ORDER BY rank DESC, name ASC
      LIMIT ${pageSize} OFFSET ${offset}
    `;

    const totalRows = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*)::bigint AS count
      FROM "Product", plainto_tsquery('simple', ${q}) AS q(query)
      WHERE "searchVector" @@ q.query
    `;

    return {
      items: rows.map(toResult),
      total: Number(totalRows[0]?.count ?? 0n),
      page,
      pageSize,
      tookMs: Date.now() - startedAt,
    };
  }

  /**
   * Prefix-match autocomplete using the lower(name) btree index. Returns at
   * most `limit` suggestions, name-sorted. Cheap and bounded so the
   * sub-50ms p95 budget can be enforced under load.
   */
  async suggestions(q: string, limit: number): Promise<Suggestion[]> {
    const prefix = q.toLowerCase();
    const products = await prisma.product.findMany({
      where: { name: { startsWith: prefix, mode: 'insensitive' } },
      orderBy: { name: 'asc' },
      take: limit,
      select: { id: true, name: true, category: true },
    });
    return products.map((p) => ({
      value: p.name,
      productId: p.id,
      category: p.category as Suggestion['category'],
    }));
  }
}
