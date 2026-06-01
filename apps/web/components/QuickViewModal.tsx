'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Modal from '@/components/ui/Modal';
import { api, type Product } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/ToastQueue';
import { categoryGradient, initials } from '@/lib/product-visual';

interface QuickViewModalProps {
  product: Product | null;
  onClose: () => void;
}

export default function QuickViewModal({ product, onClose }: QuickViewModalProps) {
  const router = useRouter();
  const toast = useToast();
  const { token, refreshCartCount } = useAuth();
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!product) return;
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
      onClose();
    } catch (e) {
      toast.push({
        variant: 'error',
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setBusy(false);
    }
  }

  const gradient = product
    ? categoryGradient(product.category)
    : '';
  const oos = (product?.stock ?? 0) === 0;

  return (
    <Modal
      open={product !== null}
      onClose={onClose}
      title={product ? 'Quick view' : ''}
      testId="quick-view-modal"
    >
      {product && (
        <div className="space-y-4">
          <div
            className={`relative h-32 -mx-5 -mt-2 bg-gradient-to-br ${gradient} flex items-center justify-center text-card text-3xl font-bold tracking-wide`}
          >
            <span aria-hidden="true">{initials(product.name)}</span>
            <span className="absolute top-2 right-2 text-[10px] uppercase tracking-wider bg-card/90 text-brand-700 px-2 py-0.5 rounded-full font-semibold">
              {product.category}
            </span>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-ink">
              {product.name}
            </h3>
            {product.description && (
              <p className="text-sm text-ink-soft mt-1">{product.description}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-ink">
              ${(product.priceCents / 100).toFixed(2)}
            </p>
            <span className="text-xs text-ink-faint">
              {oos ? 'Sold out' : `${product.stock} in stock`}
            </span>
          </div>

          {product.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {product.tags.map((t) => (
                <span
                  key={t}
                  className="text-[11px] text-ink-soft bg-paper-deep px-2 py-0.5 rounded-full"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={add}
              disabled={busy || oos}
              data-testid="quick-view-add"
              className="flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 active:scale-95 text-card text-sm font-medium rounded-full transition-all disabled:bg-line-strong"
            >
              {oos ? 'Out of stock' : busy ? 'Adding…' : 'Add to cart'}
            </button>
            <Link
              href={`/products/${product.id}`}
              onClick={onClose}
              data-testid="quick-view-detail"
              className="px-4 py-2 border border-line hover:border-brand-300 hover:bg-brand-50 text-sm font-medium text-ink-soft rounded-full transition-colors"
            >
              View details
            </Link>
          </div>
        </div>
      )}
    </Modal>
  );
}
