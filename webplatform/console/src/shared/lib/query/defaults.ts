/**
 * TanStack Query defaults (Stage 2 §4 / FE-ADR-4). SWR-style caching with
 * retry that SKIPS 4xx (except 408/429). Streaming/mutations layer on top.
 */
import type { DefaultOptions } from '@tanstack/react-query';
import { isAppError } from '@/shared/lib/errors';

const MAX_RETRIES = 2;

export const queryDefaults: DefaultOptions = {
  queries: {
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (failureCount >= MAX_RETRIES) return false;
      if (isAppError(error)) return error.retryable;
      return true;
    },
  },
  mutations: {
    retry: false,
  },
};
