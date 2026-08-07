'use client';

/**
 * Feature `upload-references` (FS9 T-FS9.7 — **the stage's entry duty**).
 * The frozen call `POST /actors/{id}/references` (§R6.1): identity-conditioning
 * references are the INPUT that keeps an actor's face consistent — not text,
 * not a seed. FS8 deliberately left this unwired; FS9 wires it over the SAME
 * multipart seam FS7 introduced (`apiFetch({ formData })`, FE-RV-12).
 *
 * The per-file machine is HONEST (the FS7 upload precedent): while the request
 * is in flight the file shows **Queued** — `fetch` exposes no upload-progress
 * events, so NO percentage is invented — and **Verified** means the upload was
 * ACCEPTED. Nothing is claimed about what the backend then does with the
 * reference: the contract exposes no processing status, so none is shown.
 *
 * Invalidation (plan §3.2): the actor record only. References change the ACTOR,
 * not any image — no image key is touched.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { actorPaths } from '@/entities/actor';
import { queryKeys } from '@/shared/config/query-keys';
import { apiFetch } from '@/shared/lib/api';
import type { AppError } from '@/shared/lib/errors';

export type ReferencePhase = 'idle' | 'uploading' | 'failed' | 'accepted';

export interface ReferenceItem {
  readonly id: string;
  readonly file: File;
  readonly phase: ReferencePhase;
  readonly error: string | null;
}

function buildForm(file: File): FormData {
  const form = new FormData();
  form.append('file', file, file.name);
  return form;
}

export interface UseUploadReferencesApi {
  readonly items: readonly ReferenceItem[];
  readonly upload: (files: readonly File[]) => void;
  readonly retry: (itemId: string) => void;
  readonly remove: (itemId: string) => void;
  readonly rejectLocal: (rejected: readonly { file: File; reason: string }[]) => void;
  readonly isUploading: boolean;
  readonly acceptedCount: number;
  readonly clear: () => void;
}

export function useUploadReferences(
  actorId: string,
  channelId: string | null,
): UseUploadReferencesApi {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<readonly ReferenceItem[]>([]);
  const [seq, setSeq] = useState(0);

  const patch = (itemId: string, next: Partial<ReferenceItem>): void => {
    setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, ...next } : item)));
  };

  const mutation = useMutation<unknown, AppError, { itemId: string; file: File }>({
    mutationFn: ({ file }) =>
      apiFetch(actorPaths.references(actorId), { method: 'POST', formData: buildForm(file) }),
    retry: false,
    onSuccess: (_data, { itemId }) => {
      patch(itemId, { phase: 'accepted', error: null });
      void queryClient.invalidateQueries({ queryKey: queryKeys.actor(actorId) });
      if (channelId) void queryClient.invalidateQueries({ queryKey: queryKeys.actors(channelId) });
    },
    onError: (error, { itemId }) => {
      patch(itemId, { phase: 'failed', error: error.message });
    },
  });

  const start = (item: ReferenceItem): void => {
    patch(item.id, { phase: 'uploading', error: null });
    mutation.mutate({ itemId: item.id, file: item.file });
  };

  return {
    items,
    upload: (files) => {
      const next = files.map((file, i) => ({
        id: `ref_${seq + i}`,
        file,
        phase: 'idle' as const,
        error: null,
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
      }));
      setSeq((s) => s + rejected.length);
      setItems((prev) => [...prev, ...next]);
    },
    isUploading: items.some((item) => item.phase === 'uploading'),
    acceptedCount: items.filter((item) => item.phase === 'accepted').length,
    clear: () => setItems([]),
  };
}
