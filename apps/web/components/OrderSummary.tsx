import type { Order } from '@/lib/api';
import OrderStatusBadge from './OrderStatusBadge';

export default function OrderSummary({ order }: { order: Order }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">
          Order <span data-testid="order-id">{order.id}</span>
        </h2>
        <OrderStatusBadge status={order.status} />
      </div>
      <p className="text-xs text-gray-500">
        {new Date(order.createdAt).toLocaleString()}
      </p>
      <table className="w-full text-sm">
        <thead className="text-left text-gray-600 border-b">
          <tr>
            <th className="py-2">Item</th>
            <th className="py-2">Qty</th>
            <th className="py-2">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((i) => (
            <tr key={i.id} className="border-b">
              <td className="py-2 font-mono text-xs">{i.productId}</td>
              <td className="py-2">{i.quantity}</td>
              <td className="py-2">
                ${((i.unitPriceCents * i.quantity) / 100).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="font-semibold">
        Total: ${(order.totalCents / 100).toFixed(2)}
      </p>
    </div>
  );
}
