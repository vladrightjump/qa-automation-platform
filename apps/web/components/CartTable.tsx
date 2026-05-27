'use client';

import { api, type Cart } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function CartTable({
  cart,
  onChange,
}: {
  cart: Cart;
  onChange: () => void;
}) {
  const { token, refreshCartCount } = useAuth();
  const subtotal = cart.items.reduce(
    (s, i) => s + i.product.priceCents * i.quantity,
    0,
  );

  async function remove(productId: string) {
    if (!token) return;
    await api.removeFromCart(token, productId);
    await refreshCartCount();
    onChange();
  }

  if (cart.items.length === 0) {
    return <p className="text-gray-600">Your cart is empty.</p>;
  }

  return (
    <div className="space-y-3">
      <table className="w-full text-sm">
        <thead className="border-b text-left text-gray-600">
          <tr>
            <th className="py-2">Item</th>
            <th className="py-2">Qty</th>
            <th className="py-2">Subtotal</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {cart.items.map((i) => (
            <tr key={i.id} data-testid={`cart-item-${i.productId}`} className="border-b">
              <td className="py-2">{i.product.name}</td>
              <td className="py-2">{i.quantity}</td>
              <td className="py-2">
                ${((i.product.priceCents * i.quantity) / 100).toFixed(2)}
              </td>
              <td className="py-2 text-right">
                <button
                  onClick={() => remove(i.productId)}
                  data-testid={`cart-remove-${i.productId}`}
                  className="text-red-600 hover:underline"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="font-semibold" data-testid="cart-subtotal">
        Subtotal: ${(subtotal / 100).toFixed(2)}
      </p>
    </div>
  );
}
