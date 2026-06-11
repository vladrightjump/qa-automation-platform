'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api, type PagedSearch } from '@/lib/api';
import ProductCard from '@/components/features/catalog/ProductCard';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import EmptySearch from '@/components/illustrations/EmptySearch';

function SearchResults() {
  const params = useSearchParams();
  const router = useRouter();
  const q = (params.get('q') ?? '').trim();
  const page = Math.max(1, Number(params.get('page') ?? 1));
  const [data, setData] = useState<PagedSearch | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!q) {
      setData(null);
      return;
    }
    let cancelled = false;
    setErr(null);
    setData(null);
    api
      .searchProducts(q, page, 12)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e: Error) => {
        if (!cancelled) setErr(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [q, page]);

  if (!q) {
    return (
      <EmptyState
        icon={<EmptySearch />}
        title="Type something in the search box"
        description="Try a product name or category."
      />
    );
  }

  if (err) {
    return (
      <p data-testid="search-error" className="text-sm text-danger-500">
        {err}
      </p>
    );
  }

  if (!data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="block" className="h-56" />
        ))}
      </div>
    );
  }

  if (data.total === 0) {
    return (
      <EmptyState
        icon={<EmptySearch />}
        title={`No results for “${q}”`}
        description="Try a different word, or check the spelling."
      />
    );
  }

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <div className="space-y-4">
      <p
        className="text-sm text-ink-soft"
        data-testid="search-result-count"
      >
        {data.total} {data.total === 1 ? 'result' : 'results'} for{' '}
        <span className="font-medium text-ink">“{q}”</span>
        <span className="text-ink-faint"> · {data.tookMs}ms</span>
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
      {totalPages > 1 && (
        <div
          className="flex items-center justify-between text-sm"
          data-testid="search-pagination"
        >
          <button
            disabled={page <= 1}
            data-testid="search-prev"
            onClick={() =>
              router.push(`/search?q=${encodeURIComponent(q)}&page=${page - 1}`)
            }
            className="px-3 py-1.5 border border-line-strong rounded-lg text-ink hover:bg-paper-deep disabled:opacity-40 transition-colors"
          >
            Prev
          </button>
          <span data-testid="search-page-info">
            Page {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            data-testid="search-next"
            onClick={() =>
              router.push(`/search?q=${encodeURIComponent(q)}&page=${page + 1}`)
            }
            className="px-3 py-1.5 border border-line-strong rounded-lg text-ink hover:bg-paper-deep disabled:opacity-40 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Search</h1>
      <Suspense fallback={<p className="text-sm text-ink-soft">Loading…</p>}>
        <SearchResults />
      </Suspense>
    </section>
  );
}
