import type { Pagination } from "../types";

type Props = {
  pagination: Pagination;
  onPageChange: (page: number) => void;
  disabled?: boolean;
};

export function PaginationBar({ pagination, onPageChange, disabled }: Props) {
  const { page, totalPages, total, limit } = pagination;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="pagination-bar">
      <span className="muted">
        {from}–{to} of {total}
      </span>
      <div className="row-actions">
        <button
          type="button"
          className="btn btn-ghost"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <span className="muted">
          Page {page} / {totalPages}
        </span>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
