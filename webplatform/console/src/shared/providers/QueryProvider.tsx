'use client';

/**
 * QueryProvider (Stage 3 §7 #2). TanStack Query authority (FE-ADR-4). One
 * client per browser session (created lazily so SSR/CSR don't share state).
 * Devtools are a dev-only dynamic import — they are code-split out of the
 * production bundle entirely (Stage 2 §5/§11).
 */
import { QueryClientProvider } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { getPublicConfig } from '@/shared/config/env';
import { createQueryClient } from '@/shared/lib/query';

const ReactQueryDevtools =
  process.env.NODE_ENV === 'production'
    ? null
    : dynamic(() => import('@tanstack/react-query-devtools').then((m) => m.ReactQueryDevtools), {
        ssr: false,
      });

export function QueryProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [client] = useState(createQueryClient);
  const showDevtools = ReactQueryDevtools !== null && getPublicConfig().NEXT_PUBLIC_ENABLE_DEVTOOLS;

  return (
    <QueryClientProvider client={client}>
      {children}
      {showDevtools ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  );
}
