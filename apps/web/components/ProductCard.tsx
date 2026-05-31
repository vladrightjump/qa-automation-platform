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
      className={`group relative bg-white border border-gray-100 rounded-2xl overflow-hidden flex flex-col shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-pop ${compact ? '' : ''}`}
    >
      {/* Visual placeholder — gradient + initials. No real images yet. */}
      <Link
        href={`/products/${product.id}`}
        aria-label={`Open ${product.name}`}
        className={`relative h-32 sm:h-36 bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-2xl font-bold tracking-wide select-none`}
      >
        <span aria-hidden="true">{initials(product.name)}</span>
        {lowStock && (
          <span className="absolute top-2 left-2 text-[10px] font-semibold uppercase tracking-wider bg-white/90 text-amber-700 px-2 py-0.5 rounded-full">
            Low stock
          </span>
        )}
        {oos && (
          <span className="absolute top-2 left-2 text-[10px] font-semibold uppercase tracking-wider bg-white/90 text-gray-700 px-2 py-0.5 rounded-full">
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
            className="absolute inset-0 m-auto opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-black/30 text-white text-sm font-medium flex items-center justify-center"
          >
            <span className="bg-white/90 text-gray-900 px-3 py-1.5 rounded-full">
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
        className={`absolute top-2 right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center text-lg bg-white/90 backdrop-blur-sm shadow-sm transition-colors ${inWishlist ? 'text-accent-500' : 'text-gray-400 hover:text-accent-500'} ${pulse ? 'animate-pulse-once' : ''}`}
      >
        {inWishlist ? '♥' : '♡'}
      </button>

      <div className="p-3 sm:p-4 flex flex-col gap-2 flex-1">
        <Link
          href={`/products/${product.id}`}
          className="text-gray-900 hover:text-brand-700 transition-colors"
        >
          <h3 className="font-semibold text-sm sm:text-base leading-snug line-clamp-2">
            {product.name}
          </h3>
        </Link>
        {!compact && (
          <p className="text-xs text-gray-500 line-clamp-2">
            {product.description}
          </p>
        )}

        <div className="flex items-center justify-between mt-1">
          <p className="font-bold text-base text-gray-900">
            ${(product.priceCents / 100).toFixed(2)}
          </p>
          <span
            data-testid={`product-category-${product.id}`}
            className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 font-medium"
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
                className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full"
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
          className="mt-auto px-3 py-2 bg-brand-600 hover:bg-brand-700 active:scale-95 text-white text-sm font-medium rounded-full transition-all duration-150 disabled:bg-gray-300 disabled:active:scale-100"
        >
          {oos ? 'Out of stock' : busy ? 'Adding…' : 'Add to cart'}
        </button>
      </div>
    </article>
  );
}
