'use client';

/**
 * Lazy entrypoint (T-FS3.6). The barrel re-exports THIS, so importing
 * `@/shared/ui` never pulls TanStack Table/Virtual into a route's First Load —
 * the real module loads in its own chunk on first render (`pnpm budget`
 * enforces the outcome).
 */
import dynamic from 'next/dynamic';
import type { DataTableProps } from './DataTable';
import { Skeleton } from '../skeleton';

const LazyDataTable = dynamic(() => import('./DataTable').then((m) => m.DataTable), {
  loading: () => <Skeleton height={240} />,
});

/** Generic-preserving wrapper — `dynamic()` erases type parameters. */
export function DataTable<TData>(props: DataTableProps<TData>): React.ReactElement {
  return <LazyDataTable {...(props as unknown as DataTableProps<unknown>)} />;
}

export const Pagination = dynamic(() => import('./Pagination').then((m) => m.Pagination), {
  loading: () => <Skeleton width={200} height={28} />,
});
