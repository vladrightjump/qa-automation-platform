'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, type Product } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/ToastQueue';
import { categoryGradient, initials } from '@/lib/product-visual';

interface ProductCardProps {
  product: Product;
  onAdded?: () => void;
  onQuickView?: (product: Product) => void;
  compact?: boolean;
}

export default function ProductCard({
  product,
  onAdded,
  onQuickView,
  compact = false,
}: ProductCardProps) {
  const router = useRouter();
  const toast = useToast();
  const { token, refreshCartCount } = useAuth();
  const [busy, setBusy] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void api.getWishlist(token).then((w) => {
      if (cancelled) return;
      setInWishlist(w.items.some((i) => i.productId === product.id));
    });
    return () => {
      cancelled = true;
    };
  }, [token, product.id]);

  async function toggleWishlist() {
    if (!token) {
      router.push('/login');
      return;
    }
    const previous = inWishlist;
    setInWishlist(!previous); // optimistic
    setPulse(true);
    setTimeout(() => setPulse(false), 300);
    try {
      if (previous) {
        await api.removeFromWishlist(token, product.id);
      } else {
        await api.addToWishlist(token, product.id);
      }
    } catch (e) {
      setInWishlist(previous); // rollback
      toast.push({
        variant: 'error',
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  async function handleAdd() {
    if (!token) {
      router.push('/login');
      return;
    }
    setBusy(true);
    try {
      await api.addToCart(token, product.id, 1);
      await refreshCartCount();
      toast.push({
        variant: 'success',
        message: `Added “${product.name}” to cart`,
      });
      onAdded?.();
    } catch (e) {
      toast.push({
        variant: 'error',
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setBusy(false);
    }
  }

  const oos = product.stock === 0;
  const lowStock = !oos && product.stock <= 5;
  const gradient = categoryGradient(product.category);

  return (
    <article
      data-testid={`product-card-${product.id}`}
      className="group relative bg-card border border-line rounded-2xl overflow-hidden flex flex-col shadow-card transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-pop"
    >
      {/* Visual placeholder — gradient + initials. No real images yet. */}
      <Link
        href={`/products/${product.id}`}
        aria-label={`Open ${product.name}`}
        className={`relative h-32 sm:h-40 bg-gradient-to-br ${gradient} flex items-center justify-center text-card/95 font-display text-3xl tracking-wide select-none`}
      >
        <span aria-hidden="true">{initials(product.name)}</span>
        {lowStock && (
          <span className="absolute top-2.5 left-2.5 text-[10px] font-semibold uppercase tracking-[0.15em] bg-paper/90 text-accent-500 px-2 py-0.5 rounded-full">
            Low stock
          </span>
        )}
        {oos && (
          <span className="absolute top-2.5 left-2.5 text-[10px] font-semibold uppercase tracking-[0.15em] bg-paper/90 text-ink px-2 py-0.5 rounded-full">
            Sold out
          </span>
        )}

        {/* Quick-view overlay — only shown on hover via group-hover */}
        {onQuickView && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onQuickView(product);
            }}
            data-testid={`quick-view-${product.id}`}
            className="absolute inset-0 m-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-ink/25 text-card text-sm font-medium flex items-center justify-center"
          >
            <span className="bg-paper/95 text-ink px-3.5 py-1.5 rounded-full tracking-wide">
              Quick view
            </span>
          </button>
        )}
      </Link>

      {/* Wishlist heart — overlays the visual */}
      <button
        type="button"
        onClick={toggleWishlist}
        data-testid={`wishlist-toggle-${product.id}`}
        aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        aria-pressed={inWishlist}
        className={`absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full flex items-center justify-center text-lg bg-paper/90 backdrop-blur-sm shadow-sm transition-colors ${inWishlist ? 'text-clay-500' : 'text-ink-faint hover:text-clay-500'} ${pulse ? 'animate-pulse-once' : ''}`}
      >
        {inWishlist ? '♥' : '♡'}
      </button>

      <div className="p-4 sm:p-5 flex flex-col gap-2 flex-1">
        <Link
          href={`/products/${product.id}`}
          className="text-ink hover:text-clay-700 transition-colors"
        >
          <h3 className="font-display text-base sm:text-lg leading-snug line-clamp-2">
            {product.name}
          </h3>
        </Link>
        {!compact && (
          <p className="text-xs text-ink-soft line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        )}

        <div className="flex items-center justify-between mt-1">
          <p className="font-display text-lg text-ink tabular-nums">
            ${(product.priceCents / 100).toFixed(2)}
          </p>
          <span
            data-testid={`product-category-${product.id}`}
            className="text-[10px] uppercase tracking-[0.15em] px-2 py-0.5 rounded-full bg-paper-deep text-ink-soft font-medium"
          >
            {product.category}
          </span>
        </div>

        {!compact && product.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {product.tags.slice(0, 2).map((t) => (
              <span
                key={t}
                data-testid={`product-tag-${product.id}-${t}`}
                className="text-[10px] text-ink-faint border border-line px-1.5 py-0.5 rounded-full"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        <button
          onClick={handleAdd}
          disabled={busy || oos}
          data-testid={`add-to-cart-${product.id}`}
          className="mt-auto px-3 py-2 bg-clay-500 hover:bg-clay-600 active:scale-95 text-card text-sm font-medium rounded-full transition-all duration-200 disabled:bg-line disabled:text-ink-faint disabled:active:scale-100"
        >
          {oos ? 'Out of stock' : busy ? 'Adding…' : 'Add to cart'}
        </button>
      </div>
    </article>
  );
}
