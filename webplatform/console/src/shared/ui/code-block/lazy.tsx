'use client';

/** Lazy entrypoint — keeps Shiki (and its grammars) out of First Load. */
import dynamic from 'next/dynamic';
import { Skeleton } from '../skeleton';

export const CodeBlock = dynamic(() => import('./CodeBlock').then((m) => m.CodeBlock), {
  loading: () => <Skeleton height={120} />,
});
