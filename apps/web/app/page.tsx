'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  api,
  type ListProductsQuery,
  type PagedProducts,
  type ProductCategory,
  type ProductSort,
} from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import Toast from '@/components/Toast';
import Hero from '@/components/Hero';
import QuickViewModal from '@/components/QuickViewModal';
import RecentlyViewed from '@/components/RecentlyViewed';
import Pagination from '@/components/ui/Pagination';
import PriceRangeSlider from '@/components/ui/PriceRangeSlider';
import Select from '@/components/ui/Select';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import EmptySearch from '@/components/illustrations/EmptySearch';
import type { Product } from '@/lib/api';

const CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: 'gadgets', label: 'Gadgets' },
  { value: 'apparel', label: 'Apparel' },
  { value: 'home', label: 'Home' },
  { value: 'office', label: 'Office' },
];

const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: 'name_asc', label: 'Name (A→Z)' },
  { value: 'name_desc', label: 'Name (Z→A)' },
  { value: 'price_asc', label: 'Price (low→high)' },
  { value: 'price_desc', label: 'Price (high→low)' },
  { value: 'newest', label: 'Newest' },
];

const PRICE_MIN = 0;
const PRICE_MAX = 30000;
const PAGE_SIZE = 12;
const DEBOUNCE_MS = 300;

interface Filters {
  q: string;
  categories: ProductCategory[];
  priceMin: number;
  priceMax: number;
  sort: ProductSort;
  page: number;
}

function parseFilters(params: URLSearchParams): Filters {
  const categories = params.getAll('category').filter((c): c is ProductCategory =>
    CATEGORIES.some((cat) => cat.value === c),
  );
  const sortParam = params.get('sort');
  const sort: ProductSort =
    sortParam && SORT_OPTIONS.some((s) => s.value === sortParam)
      ? (sortParam as ProductSort)
      : 'name_asc';
  return {
    q: params.get('q') ?? '',
    categories,
    priceMin: Number(params.get('minPriceCents') ?? PRICE_MIN),
    priceMax: Number(params.get('maxPriceCents') ?? PRICE_MAX),
    sort,
    page: Math.max(1, Number(params.get('page') ?? 1)),
  };
}

function filtersToParams(f: Filters): URLSearchParams {
  const params = new URLSearchParams();
  if (f.q) params.set('q', f.q);
  for (const c of f.categories) params.append('category', c);
  if (f.priceMin !== PRICE_MIN) params.set('minPriceCents', String(f.priceMin));
  if (f.priceMax !== PRICE_MAX) params.set('maxPriceCents', String(f.priceMax));
  if (f.sort !== 'name_asc') params.set('sort', f.sort);
  if (f.page !== 1) params.set('page', String(f.page));
  return params;
}

function toQuery(f: Filters): ListProductsQuery {
  return {
    q: f.q || undefined,
    category: f.categories.length ? f.categories : undefined,
    minPriceCents: f.priceMin !== PRICE_MIN ? f.priceMin : undefined,
    maxPriceCents: f.priceMax !== PRICE_MAX ? f.priceMax : undefined,
    sort: f.sort,
    page: f.page,
    pageSize: PAGE_SIZE,
  };
}

export default function HomePage() {
  return (
    <Suspense fallback={<p className="text-ink-faint">Loading…</p>}>
      <HomePageInner />
    </Suspense>
  );
}

function HomePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = useMemo(
    () => parseFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const [result, setResult] = useState<PagedProducts | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(filters.q);
  const [quickView, setQuickView] = useState<Product | null>(null);
  const reqRef = useRef(0);

  useEffect(() => {
    setSearchInput(filters.q);
  }, [filters.q]);

  useEffect(() => {
    const reqId = ++reqRef.current;
    api
      .listProducts(toQuery(filters))
      .then((data) => {
        if (reqRef.current === reqId) {
          setResult(data);
          setErr(null);
        }
      })
      .catch((e: Error) => {
        if (reqRef.current === reqId) setErr(e.message);
      });
  }, [filters]);

  const pushFilters = useCallback(
    (next: Filters) => {
      const params = filtersToParams(next);
      const qs = params.toString();
      router.replace(qs ? `/?${qs}` : '/', { scroll: false });
    },
    [router],
  );

  // Debounce search input → URL
  useEffect(() => {
    if (searchInput === filters.q) return;
    const handle = setTimeout(() => {
      pushFilters({ ...filters, q: searchInput, page: 1 });
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchInput, filters, pushFilters]);

  function toggleCategory(c: ProductCategory) {
    const next = filters.categories.includes(c)
      ? filters.categories.filter((x) => x !== c)
      : [...filters.categories, c];
    pushFilters({ ...filters, categories: next, page: 1 });
  }

  function setSort(sort: ProductSort) {
    pushFilters({ ...filters, sort, page: 1 });
  }

  function setPrice(range: { min: number; max: number }) {
    pushFilters({
      ...filters,
      priceMin: range.min,
      priceMax: range.max,
      page: 1,
    });
  }

  function setPage(page: number) {
    pushFilters({ ...filters, page });
  }

  function clearFilters() {
    router.replace('/', { scroll: false });
  }

  const items = result?.items ?? [];
  const total = result?.total ?? 0;
  const hasActiveFilters =
    filters.q !== '' ||
    filters.categories.length > 0 ||
    filters.priceMin !== PRICE_MIN ||
    filters.priceMax !== PRICE_MAX ||
    filters.sort !== 'name_asc';

  return (
    <section className="space-y-8">
      <Hero />
      <RecentlyViewed excludeId={null} />
      {err && <Toast message={err} />}

      <div id="catalog" className="grid gap-6 md:grid-cols-[240px_1fr]">
        <aside className="space-y-5 md:sticky md:top-20 self-start">
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1.5">
              Search
            </label>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              data-testid="catalog-search"
              placeholder="Find products…"
              className="w-full border border-line rounded-full px-3 py-2 text-sm bg-card focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-shadow outline-none"
            />
          </div>

          <fieldset>
            <legend className="text-sm font-medium text-ink-soft mb-1">
              Category
            </legend>
            <div className="space-y-1">
              {CATEGORIES.map((c) => (
                <label
                  key={c.value}
                  className="flex items-center gap-2 text-sm text-ink-soft"
                >
                  <input
                    type="checkbox"
                    checked={filters.categories.includes(c.value)}
                    onChange={() => toggleCategory(c.value)}
                    data-testid={`catalog-category-${c.value}`}
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <p className="text-sm font-medium text-ink-soft mb-1">Price</p>
            <PriceRangeSlider
              min={PRICE_MIN}
              max={PRICE_MAX}
              value={{ min: filters.priceMin, max: filters.priceMax }}
              onChange={setPrice}
              testId="catalog-price"
            />
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              data-testid="catalog-clear"
              className="text-sm text-brand-600 hover:text-brand-700 hover:underline transition-colors"
            >
              Clear filters
            </button>
          )}
        </aside>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span
              data-testid="catalog-result-count"
              className="text-sm text-ink-soft"
            >
              {total} result{total === 1 ? '' : 's'}
            </span>
            <Select<ProductSort>
              value={filters.sort}
              options={SORT_OPTIONS}
              onChange={setSort}
              label="Sort"
              testId="catalog-sort"
            />
          </div>

          {!result && !err && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-card rounded-2xl overflow-hidden border border-line shadow-card"
                >
                  <Skeleton variant="block" className="h-32 sm:h-36 rounded-none" />
                  <div className="p-4 space-y-2">
                    <Skeleton variant="line" width="70%" />
                    <Skeleton variant="line" width="40%" />
                    <Skeleton
                      variant="line"
                      width="90%"
                      className="h-7 mt-4"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          {result && items.length === 0 && (
            <EmptyState
              testId="catalog-empty"
              icon={<EmptySearch />}
              title="No products match these filters"
              description="Try a broader search or remove a filter to see more results."
              action={
                <button
                  onClick={clearFilters}
                  data-testid="catalog-empty-clear"
                  className="inline-flex items-center bg-brand-600 hover:bg-brand-700 text-card text-sm font-medium px-4 py-2 rounded-full transition-colors active:scale-95"
                >
                  Clear filters
                </button>
              }
            />
          )}
          {items.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onQuickView={setQuickView}
                />
              ))}
            </div>
          )}
          {result && total > PAGE_SIZE && (
            <Pagination
              page={filters.page}
              pageSize={PAGE_SIZE}
              total={total}
              onChange={setPage}
              testId="catalog-pagination"
            />
          )}
        </div>
      </div>

      <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />
    </section>
  );
}
