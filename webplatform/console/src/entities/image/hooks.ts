'use client';

/**
 * Entity `image` — query hooks (FS9). Channel-scoped, entity-local keys
 * (plan §3.2); initialData carries a `forChannelId` guard upstream (the FS5
 * lesson). Mutations live in `features/regenerate-image`.
 *
 * **Honest polling (FE-ADR-9):** the contract exposes no generation stream, so
 * a record refetches on an interval ONLY while its parsed status is a
 * recognised in-flight value, and stops at any terminal one. An UNKNOWN wire
 * status polls nothing — the console never guesses that work is in flight, and
 * never renders a percentage the transport cannot report (plan §3.2/§6.3).
 */
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/shared/lib/api';
import { imageKeys } from './keys';
import {
  mapImage,
  mapImageAttempt,
  mapSimilarityReport,
  sortImages,
  type ImageAttemptVM,
  type ImageHistoryEntryWireDTO,
  type ImageSimilarityWireDTO,
  type ImageVM,
  type ImageWireDTO,
  type SimilarityReportVM,
} from './model';
import { imagePaths } from './paths';

/** Poll cadence while the backend is generating (stand-in and live share it). */
export const IMAGE_POLL_MS = 2_000;

export async function fetchImages(
  channelId: string,
  signal?: AbortSignal,
): Promise<readonly ImageVM[]> {
  const wire = await apiFetch<readonly ImageWireDTO[]>(
    imagePaths.list(channelId),
    signal ? { signal } : {},
  );
  return sortImages(wire.map(mapImage));
}

export async function fetchImage(id: string, signal?: AbortSignal): Promise<ImageVM> {
  const wire = await apiFetch<ImageWireDTO>(imagePaths.detail(id), signal ? { signal } : {});
  return mapImage(wire);
}

export async function fetchImageHistory(
  id: string,
  signal?: AbortSignal,
): Promise<readonly ImageAttemptVM[]> {
  const wire = await apiFetch<readonly ImageHistoryEntryWireDTO[]>(
    imagePaths.history(id),
    signal ? { signal } : {},
  );
  return [...wire].map(mapImageAttempt).sort((a, b) => a.attempt - b.attempt);
}

export async function fetchImageSimilarity(
  id: string,
  signal?: AbortSignal,
): Promise<SimilarityReportVM> {
  const wire = await apiFetch<ImageSimilarityWireDTO>(
    imagePaths.similarity(id),
    signal ? { signal } : {},
  );
  return mapSimilarityReport(wire);
}

export function useImages(channelId: string | null, initialData?: readonly ImageVM[]) {
  return useQuery<readonly ImageVM[]>({
    queryKey: imageKeys.list(channelId ?? 'none'),
    queryFn: ({ signal }) => fetchImages(channelId ?? '', signal),
    enabled: channelId !== null,
    ...(initialData !== undefined ? { initialData } : {}),
    staleTime: 30_000,
    // Honest generation truth: poll only while a record is actually working.
    refetchInterval: (query) =>
      (query.state.data ?? []).some((image) => image.working) ? IMAGE_POLL_MS : false,
  });
}

export function useImage(id: string | null) {
  return useQuery<ImageVM>({
    queryKey: imageKeys.detail(id ?? 'none'),
    queryFn: ({ signal }) => fetchImage(id ?? '', signal),
    enabled: id !== null,
    staleTime: 15_000,
    refetchInterval: (query) => (query.state.data?.working ? IMAGE_POLL_MS : false),
  });
}

export function useImageHistory(id: string | null) {
  return useQuery<readonly ImageAttemptVM[]>({
    queryKey: imageKeys.history(id ?? 'none'),
    queryFn: ({ signal }) => fetchImageHistory(id ?? '', signal),
    enabled: id !== null,
    staleTime: 30_000,
  });
}

export function useImageSimilarity(id: string | null) {
  return useQuery<SimilarityReportVM>({
    queryKey: imageKeys.similarity(id ?? 'none'),
    queryFn: ({ signal }) => fetchImageSimilarity(id ?? '', signal),
    enabled: id !== null,
    staleTime: 60_000,
  });
}
