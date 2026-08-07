'use client';

/**
 * useSessionQuery (FS4 — entity `session`, the project's first entity slice).
 * Client-side session refresh through the BFF relay of the contract
 * `GET /auth/me`. The initial session arrives server-rendered via AuthProvider
 * (Stage 3 §7 #3); this query keeps it fresh (SWR) under the shared
 * `['session']` key. 401 resolves to `null` — an expected state, not an error.
 */
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/config/query-keys';
import { AppError } from '@/shared/lib/errors';
import type { SessionDTO } from '@/shared/types';

export async function fetchSession(signal?: AbortSignal): Promise<SessionDTO | null> {
  let res: Response;
  try {
    res = await fetch('/api/auth/me', {
      credentials: 'same-origin',
      ...(signal ? { signal } : {}),
    });
  } catch {
    throw new AppError({
      kind: 'network',
      message: 'Session check failed — you appear to be offline.',
    });
  }
  if (res.status === 401) return null;
  if (!res.ok) {
    throw new AppError({ kind: 'server', status: res.status, message: 'Session check failed.' });
  }
  return (await res.json()) as SessionDTO;
}

export function useSessionQuery(initialSession: SessionDTO | null = null) {
  return useQuery<SessionDTO | null, AppError>({
    queryKey: queryKeys.session(),
    queryFn: ({ signal }) => fetchSession(signal),
    initialData: initialSession,
    staleTime: 60_000,
    retry: false, // Stage 3 §8: no retry on auth.
  });
}
