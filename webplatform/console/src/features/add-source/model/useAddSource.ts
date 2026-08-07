'use client';

/**
 * Feature `add-source` — upload transport (FS7 T-FS7.5, §R9.4/§R9.10).
 * Composition of the FROZEN contract only:
 *   POST /documents (multipart *(assumed)* — FE-RV-10 single transport seam)
 *   → 201 document, then POST /documents/{id}/assign {channel_id} (§R2.6)
 *   so the source lands in the ACTIVE channel's isolated scope.
 * “Upload new version” = PUT /documents/{id} (multipart, same seam).
 * The per-file state machine is HONEST: uploading → ingesting (server truth,
 * polled by the entity hooks) → ready/failed. No invented percentages — the
 * transport exposes no progress events, so none are shown.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { documentPaths, type DocumentWireDTO } from '@/entities/document';
import { queryKeys } from '@/shared/config/query-keys';
import { apiFetch } from '@/shared/lib/api';
import type { AppError } from '@/shared/lib/errors';

export type AddSourcePhase = 'idle' | 'uploading' | 'failed' | 'accepted';

export interface AddSourceItem {
  readonly id: string;
  readonly file: File;
  readonly phase: AddSourcePhase;
  readonly error: string | null;
  /** Wire id once the upload was accepted (ingestion continues server-side). */
  readonly documentId: string | null;
}

function buildForm(file: File): FormData {
  const form = new FormData();
  form.append('file', file, file.name);
  return form;
}

export interface UseAddSourceApi {
  readonly items: readonly AddSourceItem[];
  readonly upload: (files: readonly File[]) => void;
  readonly retry: (itemId: string) => void;
  readonly remove: (itemId: string) => void;
  readonly rejectLocal: (rejected: readonly { file: File; reason: string }[]) => void;
  readonly isUploading: boolean;
  readonly acceptedCount: number;
  readonly clear: () => void;
}

/** Upload one or more sources into `channelId` (upload → assign, see above). */
export function useAddSource(channelId: string): UseAddSourceApi {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<readonly AddSourceItem[]>([]);
  const [seq, setSeq] = useState(0);

  const patch = (itemId: string, next: Partial<AddSourceItem>): void => {
    setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, ...next } : item)));
  };

  const mutation = useMutation<DocumentWireDTO, AppError, { itemId: string; file: File }>({
    mutationFn: async ({ file }) => {
      const created = await apiFetch<DocumentWireDTO>(documentPaths.create(), {
        method: 'POST',
        formData: buildForm(file),
      });
      await apiFetch(documentPaths.assign(created.id), {
        method: 'POST',
        json: { channel_id: channelId },
      });
      return created;
    },
    retry: false,
    onSuccess: (created, { itemId }) => {
      patch(itemId, { phase: 'accepted', documentId: created.id, error: null });
      // Plan §3.2: upload → invalidate documents(activeChannelId). The list
      // then shows the server's ingest truth and polls while it works.
      void queryClient.invalidateQueries({ queryKey: queryKeys.documents(channelId) });
    },
    onError: (error, { itemId }) => {
      patch(itemId, { phase: 'failed', error: error.message });
    },
  });

  const start = (item: AddSourceItem): void => {
    patch(item.id, { phase: 'uploading', error: null });
    mutation.mutate({ itemId: item.id, file: item.file });
  };

  return {
    items,
    upload: (files) => {
      const next = files.map((file, i) => ({
        id: `up_${seq + i}`,
        file,
        phase: 'idle' as const,
        error: null,
        documentId: null,
      }));
      setSeq((s) => s + files.length);
      setItems((prev) => [...prev, ...next]);
      next.forEach(start);
    },
    retry: (itemId) => {
      const item = items.find((entry) => entry.id === itemId);
      if (item) start(item);
    },
    remove: (itemId) => setItems((prev) => prev.filter((item) => item.id !== itemId)),
    rejectLocal: (rejected) => {
      const next = rejected.map(({ file, reason }, i) => ({
        id: `rj_${seq + i}`,
        file,
        phase: 'failed' as const,
        error: reason,
        documentId: null,
      }));
      setSeq((s) => s + rejected.length);
      setItems((prev) => [...prev, ...next]);
    },
    isUploading: items.some((item) => item.phase === 'uploading'),
    acceptedCount: items.filter((item) => item.phase === 'accepted').length,
    clear: () => setItems([]),
  };
}

/** Upload a NEW VERSION of an existing document (PUT /documents/{id}, §R9.10). */
export function useUploadVersion(options?: { onDone?: () => void }) {
  const queryClient = useQueryClient();

  const mutation = useMutation<unknown, AppError, { documentId: string; file: File }>({
    mutationFn: ({ documentId, file }) =>
      apiFetch(documentPaths.update(documentId), {
        method: 'PUT',
        formData: buildForm(file),
      }),
    retry: false,
    onSuccess: (_data, { documentId }) => {
      // Plan §3.2: new-version → document + versions + list (re-ingests).
      void queryClient.invalidateQueries({ queryKey: queryKeys.document(documentId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.documentVersions(documentId) });
      void queryClient.invalidateQueries({ queryKey: ['documents', 'list'] });
      options?.onDone?.();
    },
  });

  return {
    uploadVersion: (documentId: string, file: File) => mutation.mutate({ documentId, file }),
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
