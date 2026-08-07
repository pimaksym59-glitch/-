'use client';

import {
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { clsx } from 'clsx';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight } from 'lucide-react';
import { Fragment, useRef, useState } from 'react';
import { Checkbox } from '../checkbox/Checkbox';
import { EmptyState } from '../empty-state';
import { ErrorState } from '../error-state/ErrorState';
import { Skeleton } from '../skeleton';
import { Pagination } from './Pagination';

/**
 * DataTable (D2 §13.5, TanStack Table + Virtual — HEAVY, consume lazily).
 * Sticky overline header · density-aware rows (44/36) · hairline dividers ·
 * right-aligned numerics (declared per column via `meta.numeric`) · sort ·
 * row select + bulk action bar · expandable rows · pagination OR virtualized
 * scroll · keyboard row nav (`j`/`k`, `Enter`) · empty/loading/error per
 * §15–16. Real table semantics; sortable headers announce state.
 */
export interface DataTableProps<TData> {
  readonly label: string;
  readonly columns: readonly ColumnDef<TData, unknown>[];
  readonly data: readonly TData[];
  readonly getRowId?: (row: TData, index: number) => string;
  readonly state?: 'idle' | 'loading' | 'error';
  readonly errorTitle?: string;
  readonly onRetry?: () => void;
  readonly emptyTitle?: string;
  readonly emptyDescription?: string;
  readonly enableSelection?: boolean;
  /** Bulk bar content given the selected rows (appears on selection). */
  readonly bulkActions?: (selected: readonly TData[], clear: () => void) => React.ReactNode;
  readonly onRowActivate?: (row: TData) => void;
  readonly renderExpanded?: (row: TData) => React.ReactNode;
  /** Paginate (default, `pageSize`) or virtualize long lists. */
  readonly pageSize?: number;
  readonly virtualized?: boolean;
  readonly maxHeight?: number;
  readonly className?: string;
}

export function DataTable<TData>({
  label,
  columns,
  data,
  getRowId,
  state = 'idle',
  errorTitle = 'Couldn’t load this table',
  onRetry,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  enableSelection = false,
  bulkActions,
  onRowActivate,
  renderExpanded,
  pageSize = 25,
  virtualized = false,
  maxHeight = 480,
  className,
}: DataTableProps<TData>): React.ReactElement {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const allColumns: ColumnDef<TData, unknown>[] = [
    ...(enableSelection
      ? [
          {
            id: '__select',
            enableSorting: false,
            header: ({ table }) => (
              <Checkbox
                label="Select all rows"
                hideLabel
                checked={
                  table.getIsAllRowsSelected()
                    ? true
                    : table.getIsSomeRowsSelected()
                      ? 'indeterminate'
                      : false
                }
                onCheckedChange={() => table.toggleAllRowsSelected()}
              />
            ),
            cell: ({ row }) => (
              <Checkbox
                label={`Select row ${row.index + 1}`}
                hideLabel
                checked={row.getIsSelected()}
                onCheckedChange={() => row.toggleSelected()}
              />
            ),
            size: 36,
          } satisfies ColumnDef<TData, unknown>,
        ]
      : []),
    ...(renderExpanded
      ? [
          {
            id: '__expand',
            enableSorting: false,
            header: () => null,
            cell: ({ row }) => (
              <button
                type="button"
                aria-label={row.getIsExpanded() ? 'Collapse row' : 'Expand row'}
                aria-expanded={row.getIsExpanded()}
                onClick={row.getToggleExpandedHandler()}
                className="inline-flex size-6 items-center justify-center rounded-sm text-secondary hover:bg-interactive-subtle hover:text-primary"
              >
                {row.getIsExpanded() ? (
                  <ChevronDown aria-hidden className="size-4" />
                ) : (
                  <ChevronRight aria-hidden className="size-4" />
                )}
              </button>
            ),
            size: 32,
          } satisfies ColumnDef<TData, unknown>,
        ]
      : []),
    ...columns,
  ];

  const table = useReactTable({
    data: data as TData[],
    columns: allColumns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    ...(renderExpanded ? { getRowCanExpand: () => true } : {}),
    enableRowSelection: enableSelection,
    ...(getRowId ? { getRowId } : {}),
    ...(virtualized ? {} : { getPaginationRowModel: getPaginationRowModel() }),
    initialState: { pagination: { pageSize } },
  });

  const rows = table.getRowModel().rows;
  const virtualizer = useVirtualizer({
    count: virtualized ? rows.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 44,
    overscan: 12,
  });

  function onRowKeyDown(e: React.KeyboardEvent<HTMLTableRowElement>, index: number): void {
    if (e.key === 'j' || e.key === 'k') {
      e.preventDefault();
      const next = e.key === 'j' ? index + 1 : index - 1;
      const target = e.currentTarget.parentElement?.querySelector<HTMLTableRowElement>(
        `tr[data-row-index="${next}"]`,
      );
      target?.focus();
    } else if (e.key === 'Enter') {
      const row = rows[index];
      if (row && onRowActivate) onRowActivate(row.original);
    }
  }

  if (state === 'loading') {
    return (
      <div className={clsx('flex flex-col gap-2', className)} aria-busy="true">
        <Skeleton height={36} />
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} height={40} />
        ))}
      </div>
    );
  }
  if (state === 'error') {
    return (
      <ErrorState
        scope="section"
        title={errorTitle}
        {...(onRetry ? { onRetry } : {})}
        {...(className !== undefined ? { className } : {})}
      />
    );
  }
  if (data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        {...(emptyDescription !== undefined ? { description: emptyDescription } : {})}
        {...(className !== undefined ? { className } : {})}
      />
    );
  }

  const selected = table.getSelectedRowModel().rows.map((r) => r.original);

  return (
    <div className={clsx('flex flex-col gap-2', className)}>
      {enableSelection && selected.length > 0 && bulkActions ? (
        <div
          role="toolbar"
          aria-label={`Bulk actions — ${selected.length} selected`}
          className="flex items-center gap-3 rounded-lg border border-border-default bg-raised px-3 py-2"
        >
          <span className="text-[13px] font-medium text-primary">{selected.length} selected</span>
          <div className="flex items-center gap-2">
            {bulkActions(selected, () => setRowSelection({}))}
          </div>
        </div>
      ) : null}
      <div
        ref={scrollRef}
        className="overflow-auto rounded-lg border border-border-subtle"
        style={virtualized ? { maxHeight } : undefined}
      >
        <table aria-label={label} className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-[1] bg-surface">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border-default">
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const dir = header.column.getIsSorted();
                  const numeric = (
                    header.column.columnDef.meta as { numeric?: boolean } | undefined
                  )?.numeric;
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={
                        dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : undefined
                      }
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                      className={clsx(
                        'px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-secondary',
                        numeric ? 'text-right' : 'text-left',
                        'first:sticky first:left-0 first:bg-surface',
                      )}
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 rounded-sm hover:text-primary"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {dir === 'asc' ? (
                            <ArrowUp aria-hidden className="size-3" />
                          ) : dir === 'desc' ? (
                            <ArrowDown aria-hidden className="size-3" />
                          ) : null}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody
            style={
              virtualized
                ? { height: virtualizer.getTotalSize(), position: 'relative', display: 'block' }
                : undefined
            }
          >
            {(virtualized ? virtualizer.getVirtualItems() : rows.map((_, i) => ({ index: i }))).map(
              (v) => {
                const row = rows[v.index];
                if (!row) return null;
                const virtualItem = virtualized ? (v as { index: number; start: number }) : null;
                return (
                  <Fragment key={row.id}>
                    <tr
                      tabIndex={0}
                      data-row-index={v.index}
                      data-selected={row.getIsSelected() || undefined}
                      onKeyDown={(e) => onRowKeyDown(e, v.index)}
                      {...(onRowActivate ? { onClick: () => onRowActivate(row.original) } : {})}
                      style={
                        virtualItem
                          ? {
                              position: 'absolute',
                              top: 0,
                              transform: `translateY(${virtualItem.start}px)`,
                              display: 'table',
                              tableLayout: 'fixed',
                              width: '100%',
                            }
                          : undefined
                      }
                      className={clsx(
                        'group h-11 border-b border-border-subtle transition-colors duration-[120ms] [[data-density=compact]_&]:h-9',
                        'hover:bg-interactive-subtle focus-visible:bg-interactive-subtle',
                        'data-[selected]:bg-[color:var(--interactive-subtle)]',
                        onRowActivate && 'cursor-pointer',
                      )}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const numeric = (
                          cell.column.columnDef.meta as { numeric?: boolean } | undefined
                        )?.numeric;
                        return (
                          <td
                            key={cell.id}
                            className={clsx(
                              'px-3 py-0 text-primary',
                              numeric && 'text-right tabular-nums',
                              'first:sticky first:left-0 first:bg-surface group-hover:first:bg-transparent',
                            )}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        );
                      })}
                    </tr>
                    {row.getIsExpanded() && renderExpanded ? (
                      <tr className="border-b border-border-subtle bg-inset">
                        <td colSpan={row.getVisibleCells().length} className="px-4 py-3">
                          {renderExpanded(row.original)}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              },
            )}
          </tbody>
        </table>
      </div>
      {!virtualized && table.getPageCount() > 1 ? (
        <Pagination
          page={table.getState().pagination.pageIndex + 1}
          pageCount={table.getPageCount()}
          onPageChange={(p) => table.setPageIndex(p - 1)}
        />
      ) : null}
    </div>
  );
}
