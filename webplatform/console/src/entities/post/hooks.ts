'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/config/query-keys';
import { apiFetch } from '@/shared/lib/api';
import {
  mapPost,
  mapPostHistory,
  type PostHistoryEntryWireDTO,
  type PostHistoryVM,
  type PostVM,
  type PostWireDTO,
} from './model';

export async function fetchNeedsReview(
  channelId: string,
  signal?: AbortSignal,
): Promise<readonly PostVM[]> {
  const wire = await apiFetch<readonly PostWireDTO[]>(
    `/channels/${encodeURIComponent(channelId)}/posts?status=needs_review`,
    signal ? { signal } : {},
  );
  return wire.map(mapPost);
}

/** FS8 additive: the CONTENT-memory level (§R9.1 `memory kind=published_post`)
 * read through the same frozen posts endpoint the FS5 queue already uses — no
 * new entity, no new endpoint (plan §1/§3.2). */
export async function fetchPublishedPosts(
  channelId: string,
  signal?: AbortSignal,
): Promise<readonly PostVM[]> {
  const wire = await apiFetch<readonly PostWireDTO[]>(
    `/channels/${encodeURIComponent(channelId)}/posts?status=published`,
    signal ? { signal } : {},
  );
  return wire.map(mapPost);
}

export async function fetchPost(id: string, signal?: AbortSignal): Promise<PostVM> {
  const wire = await apiFetch<PostWireDTO>(
    `/posts/${encodeURIComponent(id)}`,
    signal ? { signal } : {},
  );
  return mapPost(wire);
}

export async function fetchPostHistory(
  id: string,
  signal?: AbortSignal,
): Promise<readonly PostHistoryVM[]> {
  const wire = await apiFetch<readonly PostHistoryEntryWireDTO[]>(
    `/posts/${encodeURIComponent(id)}/history`,
    signal ? { signal } : {},
  );
  return wire.map(mapPostHistory);
}

export function useNeedsReview(channelId: string | null, initialData?: readonly PostVM[]) {
  return useQuery<readonly PostVM[]>({
    queryKey: queryKeys.needsReview(channelId ?? 'none'),
    queryFn: ({ signal }) => fetchNeedsReview(channelId ?? '', signal),
    enabled: channelId !== null,
    ...(initialData !== undefined ? { initialData } : {}),
    staleTime: 15_000,
  });
}

/** FS8: content memory for the Memory Explorer's "Published posts" group. */
export function usePublishedPosts(channelId: string | null) {
  return useQuery<readonly PostVM[]>({
    queryKey: queryKeys.publishedPosts(channelId ?? 'none'),
    queryFn: ({ signal }) => fetchPublishedPosts(channelId ?? '', signal),
    enabled: channelId !== null,
    staleTime: 30_000,
  });
}

export function usePost(id: string | null) {
  return useQuery<PostVM>({
    queryKey: queryKeys.post(id ?? 'none'),
    queryFn: ({ signal }) => fetchPost(id ?? '', signal),
    enabled: id !== null,
    staleTime: 15_000,
  });
}

export function usePostHistory(id: string | null) {
  return useQuery<readonly PostHistoryVM[]>({
    queryKey: queryKeys.postHistory(id ?? 'none'),
    queryFn: ({ signal }) => fetchPostHistory(id ?? '', signal),
    enabled: id !== null,
    staleTime: 30_000,
  });
}
