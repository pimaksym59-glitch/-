'use client';

/**
 * Entity `document` — query hooks (FS7). Channel-scoped keys (plan §3.2);
 * initialData carries a `forChannelId` guard upstream (FS5 lesson). Ingest
 * progress is honest POLLING (FE-ADR-9 — the contract has no ingest SSE):
 * a query refetches on an interval ONLY while a document is still ingesting,
 * and stops at ready/failed. Mutations live in `features/add-source`.
 */
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/config/query-keys';
import { apiFetch } from '@/shared/lib/api';
import { documentPaths } from './paths';
import {
  mapDocument,
  mapDocumentDetail,
  mapDocumentVersion,
  type DocumentDetailVM,
  type DocumentDetailWireDTO,
  type DocumentVersionVM,
  type DocumentVersionWireDTO,
  type DocumentVM,
  type DocumentWireDTO,
} from './model';

/** Poll cadence while ingestion works (stand-in and live share the value). */
export const INGEST_POLL_MS = 2_000;

export async function fetchDocuments(
  channelId: string,
  signal?: AbortSignal,
): Promise<readonly DocumentVM[]> {
  const wire = await apiFetch<readonly DocumentWireDTO[]>(
    documentPaths.list(channelId),
    signal ? { signal } : {},
  );
  return wire.map(mapDocument);
}

export async function fetchDocument(id: string, signal?: AbortSignal): Promise<DocumentDetailVM> {
  const wire = await apiFetch<DocumentDetailWireDTO>(
    documentPaths.detail(id),
    signal ? { signal } : {},
  );
  return mapDocumentDetail(wire);
}

export async function fetchDocumentVersions(
  id: string,
  signal?: AbortSignal,
): Promise<readonly DocumentVersionVM[]> {
  const wire = await apiFetch<readonly DocumentVersionWireDTO[]>(
    documentPaths.versions(id),
    signal ? { signal } : {},
  );
  return wire.map(mapDocumentVersion);
}

export function useDocuments(channelId: string | null, initialData?: readonly DocumentVM[]) {
  return useQuery<readonly DocumentVM[]>({
    queryKey: queryKeys.documents(channelId ?? 'none'),
    queryFn: ({ signal }) => fetchDocuments(channelId ?? '', signal),
    enabled: channelId !== null,
    ...(initialData !== undefined ? { initialData } : {}),
    staleTime: 30_000,
    // Honest ingest truth: poll only while something is actually ingesting.
    refetchInterval: (query) =>
      (query.state.data ?? []).some((doc) => doc.ingesting) ? INGEST_POLL_MS : false,
  });
}

export function useDocument(id: string | null) {
  return useQuery<DocumentDetailVM>({
    queryKey: queryKeys.document(id ?? 'none'),
    queryFn: ({ signal }) => fetchDocument(id ?? '', signal),
    enabled: id !== null,
    staleTime: 15_000,
    refetchInterval: (query) => (query.state.data?.ingesting ? INGEST_POLL_MS : false),
  });
}

export function useDocumentVersions(id: string | null) {
  return useQuery<readonly DocumentVersionVM[]>({
    queryKey: queryKeys.documentVersions(id ?? 'none'),
    queryFn: ({ signal }) => fetchDocumentVersions(id ?? '', signal),
    enabled: id !== null,
    staleTime: 30_000,
  });
}
