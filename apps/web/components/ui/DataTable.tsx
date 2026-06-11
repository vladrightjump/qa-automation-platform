import type { ReactNode } from 'react';

export interface ColumnDef<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: 'left' | 'right';
  width?: string;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  rowTestId?: (row: T) => string;
  empty?: ReactNode;
  testId?: string;
}

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  rowTestId,
  empty,
  testId,
}: DataTableProps<T>) {
  return (
    <table
      data-testid={testId}
      className="w-full text-[13.5px] border border-line bg-card rounded-[10px] overflow-hidden"
    >
      <thead className="bg-paper-deep text-left text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
        <tr>
          {columns.map((c) => (
            <th
              key={c.key}
              className={`p-2 ${c.align === 'right' ? 'text-right' : ''}`}
              style={c.width ? { width: c.width } : undefined}
            >
              {c.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && empty ? (
          <tr>
            <td colSpan={columns.length} className="p-4 text-center text-ink-faint">
              {empty}
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr
              key={rowKey(row)}
              data-testid={rowTestId?.(row)}
              className="border-t border-line hover:bg-paper-deep transition-colors"
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`p-2 ${c.align === 'right' ? 'text-right' : ''}`}
                >
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
