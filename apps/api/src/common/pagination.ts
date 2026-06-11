/**
 * Generic pagination helper used by every list endpoint. The shape mirrors what
 * the web client and Playwright fixtures already expect: { items, total, page,
 * pageSize }.
 *
 * Pass a Prisma model delegate (e.g. prisma.product) plus the usual findMany
 * args; the helper adds skip/take and runs count + findMany in parallel. The
 * caller is responsible for shape — Prisma's per-model delegate types are too
 * narrow to generalise here without trading clarity for ceremony, so we accept
 * `any` and trust the call site.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface PaginationArgs {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const DEFAULT_PAGE_SIZE = 12;

export async function paginate<Item>(
  model: { findMany: (args: any) => Promise<Item[]>; count: (args: any) => Promise<number> },
  page: number | undefined,
  pageSize: number | undefined,
  args: { where?: unknown; orderBy?: unknown; include?: unknown; select?: unknown } = {},
): Promise<PaginatedResult<Item>> {
  const safePage = Math.max(1, page ?? 1);
  const safeSize = Math.max(1, pageSize ?? DEFAULT_PAGE_SIZE);

  const [items, total] = await Promise.all([
    model.findMany({
      ...args,
      skip: (safePage - 1) * safeSize,
      take: safeSize,
    }),
    model.count({ where: args.where }),
  ]);

  return { items, total, page: safePage, pageSize: safeSize };
}
