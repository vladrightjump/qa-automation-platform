'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, type Product } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useLocale } from '@/lib/i18n';
import { useToast } from '@/components/ui/ToastQueue';

interface ProductCardProps {
  product: Product;
  onAdded?: () => void;
  compact?: boolean;
}

export default function ProductCard({
  product,
  onAdded,
  compact = false,
}: ProductCardProps) {
  const router = useRouter();
  const toast = useToast();
  const { token, refreshCartCount } = useAuth();
  const { t, formatMoney } = useLocale();
  const [busy, setBusy] = useState(false);

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

  return (
    <article
      data-testid={`product-card-${product.id}`}
      className="group relative bg-card border border-line rounded-[10px] overflow-hidden flex flex-col transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-pop"
    >
      <Link
        href={`/products/${product.id}`}
        aria-label={`Open ${product.name}`}
        className="relative block aspect-[4/3] bg-paper-deep"
      >
        {lowStock && (
          <span className="absolute top-2.5 left-2.5 text-[11px] font-semibold bg-card/95 text-clay-600 px-2 py-0.5 rounded-md">
            {t('product.lowStock')}
          </span>
        )}
        {oos && (
          <span className="absolute top-2.5 left-2.5 text-[11px] font-semibold bg-card/95 text-ink-soft px-2 py-0.5 rounded-md">
            {t('product.soldOut')}
          </span>
        )}
      </Link>

      <div className="p-4 sm:p-5 flex flex-col gap-1.5 flex-1">
        <Link
          href={`/products/${product.id}`}
          className="text-ink hover:text-clay-600 transition-colors"
        >
          <h3 className="text-[14.5px] font-semibold leading-snug line-clamp-2">
            {product.name}
          </h3>
        </Link>
        <span
          data-testid={`product-category-${product.id}`}
          className="text-[12.5px] text-ink-faint"
        >
          {product.category}
        </span>
        {!compact && (
          <p className="text-xs text-ink-soft line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        )}

        <div className="mt-auto pt-2 flex items-center justify-between gap-3">
          <p
            data-testid={`product-price-${product.id}`}
            className="text-[15px] font-semibold tabular-nums text-ink"
          >
            {formatMoney(product.priceCents)}
          </p>
          <button
            onClick={handleAdd}
            disabled={busy || oos}
            data-testid={`add-to-cart-${product.id}`}
            className="border border-clay-200 text-clay-500 hover:bg-clay-50 active:scale-95 text-[13px] font-medium rounded-[7px] px-3 py-1.5 transition-colors disabled:opacity-40 disabled:active:scale-100"
          >
            {oos ? t('product.outOfStock') : busy ? t('product.adding') : t('product.addToCart')}
          </button>
        </div>
      </div>
    </article>
  );
}
