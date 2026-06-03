'use client';

import { useState, type DragEvent } from 'react';
import { api, type Cart } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useLocale } from '@/lib/i18n';
import { useToast } from '@/components/ui/ToastQueue';
import Modal from '@/components/ui/Modal';

export default function CartTable({
  cart,
  onChange,
}: {
  cart: Cart;
  onChange: () => void;
}) {
  const { token, refreshCartCount } = useAuth();
  const { t, formatMoney, currency } = useLocale();
  const toast = useToast();
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const subtotal = cart.items.reduce(
    (s, i) => s + i.product.priceCents * i.quantity,
    0,
  );

  async function remove(productId: string) {
    if (!token) return;
    try {
      await api.removeFromCart(token, productId);
      await refreshCartCount();
      onChange();
    } catch (e) {
      toast.push({ variant: 'error', message: (e as Error).message });
    }
  }

  async function setQuantity(productId: string, quantity: number) {
    if (!token) return;
    try {
      await api.updateCartItem(token, productId, quantity);
      await refreshCartCount();
      onChange();
    } catch (e) {
      toast.push({ variant: 'error', message: (e as Error).message });
    }
  }

  async function reorderTo(productId: string, target: string) {
    if (!token || productId === target) return;
    const currentOrder = cart.items.map((i) => i.productId);
    const without = currentOrder.filter((id) => id !== productId);
    const targetIdx = without.indexOf(target);
    if (targetIdx < 0) return;
    const next = [...without];
    next.splice(targetIdx, 0, productId);
    try {
      await api.reorderCart(token, next);
      onChange();
    } catch (e) {
      toast.push({ variant: 'error', message: (e as Error).message });
    }
  }

  function onDragStart(productId: string) {
    return (e: DragEvent<HTMLTableRowElement>) => {
      setDragId(productId);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', productId);
    };
  }
  function onDragOver(e: DragEvent<HTMLTableRowElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }
  function onDrop(targetId: string) {
    return (e: DragEvent<HTMLTableRowElement>) => {
      e.preventDefault();
      const src = dragId ?? e.dataTransfer.getData('text/plain');
      setDragId(null);
      if (src) void reorderTo(src, targetId);
    };
  }

  if (cart.items.length === 0) {
    return <p className="text-ink-soft">{t('cart.empty')}</p>;
  }

  return (
    <div className="space-y-3">
      <table className="w-full text-sm">
        <thead className="border-b text-left text-ink-soft">
          <tr>
            <th className="py-2" />
            <th className="py-2">{t('cart.item')}</th>
            <th className="py-2">{t('cart.qty')}</th>
            <th className="py-2">{t('cart.subtotal')}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {cart.items.map((i) => (
            <tr
              key={i.id}
              data-testid={`cart-item-${i.productId}`}
              draggable
              onDragStart={onDragStart(i.productId)}
              onDragOver={onDragOver}
              onDrop={onDrop(i.productId)}
              className="border-b"
            >
              <td className="py-2 text-ink-faint cursor-grab" data-testid={`cart-drag-${i.productId}`}>
                ⠿
              </td>
              <td className="py-2">{i.product.name}</td>
              <td className="py-2">
                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setQuantity(i.productId, i.quantity - 1)}
                    disabled={i.quantity <= 1}
                    data-testid={`cart-qty-dec-${i.productId}`}
                    aria-label="Decrease quantity"
                    className="px-2 border rounded disabled:opacity-40"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={i.product.stock}
                    value={i.quantity}
                    onChange={(e) => {
                      const n = Math.max(1, Number(e.target.value) || 1);
                      void setQuantity(i.productId, n);
                    }}
                    data-testid={`cart-qty-input-${i.productId}`}
                    className="w-12 text-center border rounded px-1 py-0.5"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity(i.productId, i.quantity + 1)}
                    disabled={i.quantity >= i.product.stock}
                    data-testid={`cart-qty-inc-${i.productId}`}
                    aria-label="Increase quantity"
                    className="px-2 border rounded disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </td>
              <td className="py-2">
                <span data-testid={`cart-line-subtotal-${i.productId}`}>
                  {formatMoney(i.product.priceCents * i.quantity)}
                </span>
              </td>
              <td className="py-2 text-right">
                <button
                  onClick={() => setConfirmRemove(i.productId)}
                  data-testid={`cart-remove-${i.productId}`}
                  className="text-red-600 hover:underline"
                >
                  {t('cart.remove')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="font-semibold" data-testid="cart-subtotal">
        {t('cart.subtotal')}: {formatMoney(subtotal)}
      </p>
      <p
        className="text-[10px] uppercase tracking-[0.15em] text-ink-faint"
        data-testid="cart-currency-affordance"
      >
        {t('cart.pricesIn', { currency })}
      </p>

      <Modal
        open={confirmRemove !== null}
        onClose={() => setConfirmRemove(null)}
        title="Remove from cart?"
        testId="cart-remove-modal"
      >
        <p className="text-sm mb-3">This will remove the item from your cart.</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setConfirmRemove(null)}
            data-testid="cart-remove-cancel"
            className="px-3 py-1.5 border rounded text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (confirmRemove) void remove(confirmRemove);
              setConfirmRemove(null);
            }}
            data-testid="cart-remove-confirm"
            className="px-3 py-1.5 bg-red-600 text-card rounded text-sm"
          >
            Remove
          </button>
        </div>
      </Modal>
    </div>
  );
}
