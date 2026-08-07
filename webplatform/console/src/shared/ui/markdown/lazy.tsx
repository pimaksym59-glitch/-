'use client';

/** Lazy entrypoint — keeps react-markdown/remark/rehype out of First Load. */
import dynamic from 'next/dynamic';
import { Skeleton } from '../skeleton';

export const Markdown = dynamic(() => import('./Markdown').then((m) => m.Markdown), {
  loading: () => (
    <div className="flex flex-col gap-2">
      <Skeleton height={14} width="90%" />
      <Skeleton height={14} width="75%" />
      <Skeleton height={14} width="85%" />
    </div>
  ),
});
