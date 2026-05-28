'use client';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
  testId?: string;
}

export default function Pagination({
  page,
  pageSize,
  total,
  onChange,
  testId = 'pagination',
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div
      data-testid={testId}
      className="flex items-center justify-between text-sm text-gray-700"
    >
      <span data-testid={`${testId}-info`}>
        Page {page} of {totalPages} · {total} item{total === 1 ? '' : 's'}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!canPrev}
          onClick={() => onChange(page - 1)}
          data-testid={`${testId}-prev`}
          className="px-3 py-1 border rounded disabled:opacity-40"
        >
          Prev
        </button>
        <button
          type="button"
          disabled={!canNext}
          onClick={() => onChange(page + 1)}
          data-testid={`${testId}-next`}
          className="px-3 py-1 border rounded disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
