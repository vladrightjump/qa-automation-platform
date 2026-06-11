'use client';

import type { Order } from '@/lib/api';
import DataTable, { type ColumnDef } from '@/components/ui/DataTable';
import OrderStatusBadge from '@/components/features/orders/OrderStatusBadge';

interface OrdersTableProps {
  rows: Order[];
  onFulfill: (o: Order) => void;
}

export default function OrdersTable({ rows, onFulfill }: OrdersTableProps) {
  const columns: ColumnDef<Order>[] = [
    {
      key: 'id',
      header: 'Order',
      cell: (o) => <span className="font-mono text-xs">{o.id}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (o) => <OrderStatusBadge status={o.status} />,
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      cell: (o) => `$${(o.totalCents / 100).toFixed(2)}`,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (o) =>
        o.status === 'PAID' ? (
          <button
            onClick={() => onFulfill(o)}
            data-testid={`admin-order-fulfill-${o.id}`}
            className="text-clay-600 hover:text-clay-700 font-medium transition-colors"
          >
            Fulfill
          </button>
        ) : null,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(o) => o.id}
      rowTestId={(o) => `admin-order-row-${o.id}`}
    />
  );
}
