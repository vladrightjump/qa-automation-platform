'use client';

import type { Product } from '@/lib/api';
import DataTable, { type ColumnDef } from '@/components/ui/DataTable';

interface ProductTableProps {
  rows: Product[];
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
}

export default function ProductTable({ rows, onEdit, onDelete }: ProductTableProps) {
  const columns: ColumnDef<Product>[] = [
    {
      key: 'id',
      header: 'ID',
      cell: (p) => <span className="font-mono text-xs">{p.id}</span>,
    },
    { key: 'name', header: 'Name', cell: (p) => p.name },
    { key: 'category', header: 'Category', cell: (p) => <span className="capitalize">{p.category}</span> },
    {
      key: 'price',
      header: 'Price',
      align: 'right',
      cell: (p) => `$${(p.priceCents / 100).toFixed(2)}`,
    },
    { key: 'stock', header: 'Stock', align: 'right', cell: (p) => p.stock },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (p) => (
        <span className="space-x-2">
          <button
            onClick={() => onEdit(p)}
            data-testid={`admin-edit-${p.id}`}
            className="text-clay-600 hover:text-clay-700 font-medium transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(p)}
            data-testid={`admin-delete-${p.id}`}
            className="text-ink-faint hover:text-danger-500 font-medium transition-colors"
          >
            Delete
          </button>
        </span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(p) => p.id}
      rowTestId={(p) => `admin-row-${p.id}`}
    />
  );
}
