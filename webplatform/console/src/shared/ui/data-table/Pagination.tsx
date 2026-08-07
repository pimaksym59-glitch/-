'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../button';

/**
 * Pagination (D2 §13.5). Simple page navigation for non-virtualized tables.
 */
export interface PaginationProps {
  readonly page: number;
  readonly pageCount: number;
  readonly onPageChange: (page: number) => void;
  readonly className?: string;
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
  className,
}: PaginationProps): React.ReactElement {
  return (
    <nav aria-label="Pagination" className={className}>
      <div className="flex items-center justify-end gap-2">
        <span className="text-[13px] tabular-nums text-secondary">
          Page {page} of {pageCount}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft aria-hidden className="size-4" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight aria-hidden className="size-4" />
        </Button>
      </div>
    </nav>
  );
}
