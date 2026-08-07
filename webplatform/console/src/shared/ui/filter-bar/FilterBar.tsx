'use client';

import { clsx } from 'clsx';
import { X } from 'lucide-react';

/**
 * FilterBar + removable filter Chip (Stage 3 §2). A presentational row that
 * composes a search slot, filter chips and a clear-all affordance. Filter
 * *state* lives in the URL (nuqs) at the call site — never here (FE-ADR-5).
 */
export interface FilterChipProps {
  readonly label: string;
  readonly onRemove?: () => void;
  readonly className?: string;
}

export function FilterChip({ label, onRemove, className }: FilterChipProps): React.ReactElement {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-pill border border-border-default bg-raised px-2.5 py-1 text-[13px] text-primary',
        className,
      )}
    >
      {label}
      {onRemove ? (
        <button
          type="button"
          aria-label={`Remove filter ${label}`}
          onClick={onRemove}
          className="inline-flex rounded-xs text-secondary transition-colors hover:text-danger"
        >
          <X aria-hidden className="size-3" />
        </button>
      ) : null}
    </span>
  );
}

export interface FilterBarProps {
  readonly label?: string;
  /** Search slot (typically a `SearchInput` with a hidden label). */
  readonly search?: React.ReactNode;
  readonly children?: React.ReactNode;
  readonly onClearAll?: () => void;
  readonly className?: string;
}

export function FilterBar({
  label = 'Filters',
  search,
  children,
  onClearAll,
  className,
}: FilterBarProps): React.ReactElement {
  return (
    <div
      role="group"
      aria-label={label}
      className={clsx('flex flex-wrap items-center gap-2', className)}
    >
      {search ? <div className="min-w-48 flex-1">{search}</div> : null}
      {children}
      {onClearAll ? (
        <button
          type="button"
          onClick={onClearAll}
          className="text-[13px] font-medium text-secondary transition-colors hover:text-primary"
        >
          Clear all
        </button>
      ) : null}
    </div>
  );
}
