'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  api,
  type PagedReviews,
  type Product,
  type ReviewSort,
  type ReviewSummary,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import ProductCard from '@/components/ProductCard';
import Toast from '@/components/Toast';
import Tabs from '@/components/ui/Tabs';
import StarRating from '@/components/ui/StarRating';
import Select from '@/components/ui/Select';
import Skeleton from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/ToastQueue';
import RecentlyViewed from '@/components/RecentlyViewed';
import RelatedProducts from '@/components/RelatedProducts';
import { pushRecent } from '@/lib/recently-viewed';

const SORT_OPTIONS: { value: ReviewSort; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'highest', label: 'Highest rated' },
  { value: 'lowest', label: 'Lowest rated' },
];

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const productId = params.id;
  const [product, setProduct] = useState<Product | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('description');

  useEffect(() => {
    if (!productId) return;
    api
      .getProduct(productId)
      .then((p) => {
        setProduct(p);
        pushRecent(p.id);
      })
      .catch((e: Error) => setErr(e.message));
  }, [productId]);

  if (err) return <Toast message={err} />;
  if (!product) {
    return (
      <div className="max-w-2xl space-y-4">
        <div className="bg-card rounded-[10px] border border-line overflow-hidden">
          <Skeleton variant="block" className="h-36 rounded-none" />
          <div className="p-4 space-y-3">
            <Skeleton variant="line" width="60%" />
            <Skeleton variant="line" width="40%" />
            <Skeleton variant="line" width="80%" />
          </div>
        </div>
        <Skeleton variant="block" className="h-32" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      <ProductCard product={product} />
      {product.stock === 0 && <StockAlertButton productId={product.id} />}
      <Tabs
        tabs={[
          {
            id: 'description',
            label: 'Description',
            content: (
              <p className="text-sm text-ink-soft">
                {product.description ?? 'No description.'}
              </p>
            ),
          },
          {
            id: 'specs',
            label: 'Specs',
            content: (
              <dl className="text-sm grid grid-cols-2 gap-y-1">
                <dt className="text-ink-faint">ID</dt>
                <dd className="font-mono">{product.id}</dd>
                <dt className="text-ink-faint">Category</dt>
                <dd className="capitalize">{product.category}</dd>
                <dt className="text-ink-faint">Stock</dt>
                <dd>{product.stock}</dd>
                <dt className="text-ink-faint">Tags</dt>
                <dd>{product.tags.join(', ') || '—'}</dd>
              </dl>
            ),
          },
          {
            id: 'reviews',
            label: 'Reviews',
            content: <ReviewsTab productId={product.id} />,
          },
        ]}
        activeId={activeTab}
        onChange={setActiveTab}
        testId="product-tabs"
      />
      <RelatedProducts productId={product.id} category={product.category} />
      <RecentlyViewed excludeId={product.id} />
    </div>
  );
}

function StockAlertButton({ productId }: { productId: string }) {
  const { token } = useAuth();
  const toast = useToast();
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    void api
      .listStockAlerts(token)
      .then((alerts) =>
        setSubscribed(alerts.some((a) => a.productId === productId)),
      )
      .catch(() => {
        /* non-fatal: leave unsubscribed */
      });
  }, [token, productId]);

  async function toggle() {
    if (!token) {
      toast.push({ variant: 'warning', message: 'Sign in to get notified.' });
      return;
    }
    setBusy(true);
    try {
      if (subscribed) {
        await api.unsubscribeStockAlert(token, productId);
        setSubscribed(false);
        toast.push({ variant: 'success', message: 'Alert removed' });
      } else {
        await api.subscribeStockAlert(token, productId);
        setSubscribed(true);
        toast.push({
          variant: 'success',
          message: 'We’ll email you when it’s back',
        });
      }
    } catch (e) {
      toast.push({ variant: 'error', message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      data-testid="stock-alert"
      className="border border-line bg-paper-deep rounded-[10px] px-4 py-3 flex items-center justify-between gap-3"
    >
      <p className="text-[13.5px] text-ink">
        {subscribed
          ? 'You’ll be notified when this item is back in stock.'
          : 'Out of stock — get notified when it returns.'}
      </p>
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={busy}
        data-testid="stock-alert-toggle"
        data-subscribed={subscribed}
        className="shrink-0 px-3 py-1.5 border border-clay-200 hover:bg-clay-50 disabled:opacity-50 text-clay-500 rounded-[7px] text-sm font-medium transition-colors"
      >
        {subscribed ? 'Cancel alert' : 'Notify me'}
      </button>
    </div>
  );
}

function ReviewsTab({ productId }: { productId: string }) {
  const { token, user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState<PagedReviews | null>(null);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [sort, setSort] = useState<ReviewSort>('newest');
  const [draft, setDraft] = useState({ rating: 0, title: '', body: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const [reviews, sum] = await Promise.all([
      api.listReviews(productId, { sort }),
      api.reviewSummary(productId),
    ]);
    setData(reviews);
    setSummary(sum);
  }, [productId, sort]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit() {
    if (!token) return;
    if (draft.rating === 0) {
      toast.push({ variant: 'warning', message: 'Pick a rating first.' });
      return;
    }
    setSubmitting(true);
    try {
      await api.createReview(token, productId, draft);
      setDraft({ rating: 0, title: '', body: '' });
      toast.push({ variant: 'success', message: 'Review posted' });
      await load();
    } catch (e) {
      toast.push({ variant: 'error', message: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3" data-testid="reviews-tab">
      <div className="flex items-center gap-3">
        <StarRating
          value={Math.round(summary?.averageRating ?? 0)}
          readOnly
          size="md"
          testId="review-summary-stars"
        />
        <span className="text-sm text-ink-soft">
          <span data-testid="review-summary-average">
            {(summary?.averageRating ?? 0).toFixed(1)}
          </span>{' '}
          ·{' '}
          <span data-testid="review-summary-count">
            {summary?.reviewCount ?? 0}
          </span>{' '}
          reviews
        </span>
      </div>

      {token && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          data-testid="review-form"
          className="border border-line rounded-[10px] p-4 bg-card space-y-2"
        >
          <p className="text-sm font-medium">Write a review</p>
          <StarRating
            value={draft.rating}
            onChange={(v) => setDraft({ ...draft, rating: v })}
            testId="review-form-rating"
          />
          <input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="Title"
            data-testid="review-form-title"
            required
            className="w-full bg-card border border-line-strong rounded-lg px-3 py-2 text-sm placeholder:text-ink-faint outline-none focus:border-clay-500 transition-colors"
          />
          <textarea
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            placeholder="Tell others what you think…"
            data-testid="review-form-body"
            required
            className="w-full bg-card border border-line-strong rounded-lg px-3 py-2 text-sm placeholder:text-ink-faint outline-none focus:border-clay-500 transition-colors"
          />
          <button
            type="submit"
            disabled={submitting}
            data-testid="review-form-submit"
            className="px-3 py-2 bg-clay-500 hover:bg-clay-600 text-card text-sm rounded-lg font-medium active:scale-95 disabled:bg-line-strong disabled:active:scale-100 transition-colors"
          >
            {submitting ? 'Posting…' : 'Post review'}
          </button>
        </form>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">All reviews</p>
        <Select<ReviewSort>
          value={sort}
          options={SORT_OPTIONS}
          onChange={setSort}
          label="Sort"
          testId="review-sort"
        />
      </div>
      {data && data.items.length === 0 && (
        <p
          data-testid="reviews-empty"
          className="text-sm text-ink-faint"
        >
          No reviews yet.
        </p>
      )}
      <ul className="space-y-2">
        {data?.items.map((r) => (
          <li
            key={r.id}
            data-testid={`review-${r.id}`}
            className="border border-line rounded-[10px] p-4 bg-card"
          >
            <div className="flex items-center gap-2">
              <StarRating
                value={r.rating}
                readOnly
                size="sm"
                testId={`review-${r.id}-stars`}
              />
              <span className="font-medium text-sm">{r.title}</span>
            </div>
            <p className="text-sm text-ink-soft mt-1">{r.body}</p>
            {user?.id === r.userId && (
              <button
                type="button"
                onClick={() => {
                  if (!token) return;
                  void api
                    .deleteReview(token, r.id)
                    .then(load)
                    .catch((e: Error) =>
                      toast.push({ variant: 'error', message: e.message }),
                    );
                }}
                data-testid={`review-${r.id}-delete`}
                className="mt-2 text-xs text-ink-faint hover:text-danger-500 transition-colors"
              >
                Delete
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
