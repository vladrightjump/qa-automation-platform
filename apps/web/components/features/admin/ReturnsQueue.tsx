'use client';

import type { Order, OrderReturn } from '@/lib/api';
import DataTable, { type ColumnDef } from '@/components/ui/DataTable';

export interface ReturnRow {
  ret: OrderReturn;
  order: Order;
}

interface ReturnsQueueProps {
  rows: ReturnRow[];
  onApprove: (r: OrderReturn) => void;
  onReject: (r: OrderReturn) => void;
  onRefund: (r: OrderReturn) => void;
}

export default function ReturnsQueue({
  rows,
  onApprove,
  onReject,
  onRefund,
}: ReturnsQueueProps) {
  const columns: ColumnDef<ReturnRow>[] = [
    {
      key: 'order',
      header: 'Order',
      cell: ({ ret }) => <span className="font-mono text-xs">{ret.orderId}</span>,
    },
    { key: 'reason', header: 'Reason', cell: ({ ret }) => ret.reason },
    {
      key: 'status',
      header: 'Status',
      cell: ({ ret }) => (
        <span
          className="font-medium"
          data-testid={`admin-return-status-${ret.id}`}
        >
          {ret.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: ({ ret }) => (
        <span className="space-x-2">
          {ret.status === 'REQUESTED' && (
            <>
              <button
                onClick={() => onApprove(ret)}
                data-testid={`admin-return-approve-${ret.id}`}
                className="text-sage-500 hover:text-sage-600 font-medium transition-colors"
              >
                Approve
              </button>
              <button
                onClick={() => onReject(ret)}
                data-testid={`admin-return-reject-${ret.id}`}
                className="text-ink-faint hover:text-danger-500 font-medium transition-colors"
              >
                Reject
              </button>
            </>
          )}
          {ret.status === 'APPROVED' && (
            <button
              onClick={() => onRefund(ret)}
              data-testid={`admin-return-refund-${ret.id}`}
              className="text-clay-600 hover:text-clay-700 font-medium transition-colors"
            >
              Refund
            </button>
          )}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-2" data-testid="admin-returns">
      <h2 className="text-[16px] font-semibold text-ink">Returns queue</h2>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.ret.id}
        rowTestId={(r) => `admin-return-row-${r.ret.id}`}
      />
    </div>
  );
}
