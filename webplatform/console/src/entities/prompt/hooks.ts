'use client';

/**
 * Entity `prompt` — query hooks (FS10). Entity-local keys (plan §3.2) and
 * **no channel scope anywhere**: the `prompts` table has no `channel_id`, so
 * these hooks take no channel id and the channel switcher cannot re-scope them
 * (owner requirement A; locked by `tests/unit/prompts-commons.test.ts`).
 *
 * **No polling.** `POST /prompts` answers 201, not a 202 queue intent, so there
 * is no queued truth to follow — nothing here invents an interval, a progress
 * value or a "processing" state (the FS9 honest-polling discipline, applied by
 * omission). Mutations live in `features/manage-prompt`.
 */
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/shared/lib/api';
import type { PromptWireDTO } from '@/shared/types';
import { promptKeys } from './keys';
import {
  groupPromptsByType,
  mapPrompt,
  sortVersions,
  type PromptGroupVM,
  type PromptVersionVM,
} from './model';
import { promptPaths } from './paths';

/** Stage 3 §8 fixes prompts at a 60 s stale window. */
export const PROMPT_STALE_MS = 60_000;

export async function fetchPrompts(
  type?: string | null,
  signal?: AbortSignal,
): Promise<readonly PromptGroupVM[]> {
  const wire = await apiFetch<readonly PromptWireDTO[]>(
    promptPaths.list(type ?? null),
    signal ? { signal } : {},
  );
  return groupPromptsByType(wire.map(mapPrompt));
}

export async function fetchPromptVersions(
  id: string,
  signal?: AbortSignal,
): Promise<readonly PromptVersionVM[]> {
  const wire = await apiFetch<readonly PromptWireDTO[]>(
    promptPaths.versions(id),
    signal ? { signal } : {},
  );
  return sortVersions(wire.map(mapPrompt));
}

/** The whole library, grouped by type. `initialData` comes from the RSC page. */
export function usePrompts(initialData?: readonly PromptGroupVM[]) {
  return useQuery<readonly PromptGroupVM[]>({
    queryKey: promptKeys.list(),
    queryFn: ({ signal }) => fetchPrompts(null, signal),
    ...(initialData !== undefined ? { initialData } : {}),
    staleTime: PROMPT_STALE_MS,
  });
}

/** The contract's own `?type=` narrowing (§Prompts) — a server-side filter. */
export function usePromptsByType(type: string | null) {
  return useQuery<readonly PromptGroupVM[]>({
    queryKey: promptKeys.byType(type ?? 'all'),
    queryFn: ({ signal }) => fetchPrompts(type, signal),
    enabled: type !== null,
    staleTime: PROMPT_STALE_MS,
  });
}

/**
 * The version chain of one row (`GET /prompts/{id}/versions`). Used by the
 * detail pane and the Inspector; if the live wire proves the list endpoint
 * returns only the newest row per type, this call is already the chain's
 * source (FE-RV-13).
 */
export function usePromptVersions(id: string | null) {
  return useQuery<readonly PromptVersionVM[]>({
    queryKey: promptKeys.versions(id ?? 'none'),
    queryFn: ({ signal }) => fetchPromptVersions(id ?? '', signal),
    enabled: id !== null,
    staleTime: PROMPT_STALE_MS,
  });
}
