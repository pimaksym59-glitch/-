'use client';

/**
 * Document inspector view (FS7 T-FS7.7) behind the unchanged FS2
 * `?inspect=document:<id>` contract: overview (source/size/status/channel/
 * version) + version Timeline + the §R9.3 intents — re-ingest (202
 * queued-truth), assign-to-channel, soft delete (confirmed) — offered ONLY to
 * `content.edit` roles (SEC-7). Chunk-level detail (“used by”, scores) has no
 * wire source and is honestly absent (plan §5.2 D1).
 */
import { BookOpen, RefreshCw, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useChannels } from '@/entities/channel';
import { useDocument, useDocumentVersions, VersionsTimeline } from '@/entities/document';
import { useDocumentIntents } from '@/features/add-source';
import { useInspector } from '@/shared/hooks';
import { formatBytes, formatDate } from '@/shared/lib/format';
import { useCan } from '@/shared/providers';
import { StatusBadge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';
import { ErrorState } from '@/shared/ui/error-state';
import { Select } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';

export function DocumentInspector({ id }: { readonly id: string }): React.ReactElement {
  const router = useRouter();
  const can = useCan();
  const { close } = useInspector();
  const doc = useDocument(id);
  const versions = useDocumentVersions(id);
  const channels = useChannels();
  const { reindex, reindexPending, deleteDocument, deletePending, assign, assignPending } =
    useDocumentIntents();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (doc.isPending) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Skeleton height={20} width="70%" />
        <Skeleton height={14} width="45%" />
        <Skeleton height={120} />
      </div>
    );
  }
  if (doc.isError) {
    return (
      <div className="p-4">
        <ErrorState
          scope="section"
          title="Couldn’t load this document"
          onRetry={() => void doc.refetch()}
        />
      </div>
    );
  }

  const data = doc.data;
  const canEdit = can('content.edit');
  const channelName =
    channels.data?.find((channel) => channel.id === data.channelId)?.name ??
    data.channelId ??
    'Unassigned';

  return (
    <div className="flex flex-col gap-4 p-4">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary">
          Document
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h2 className="min-w-0 flex-1 text-sm font-semibold text-primary">{data.title}</h2>
          {data.status ? (
            <StatusBadge status={data.status} />
          ) : (
            <span className="text-xs text-secondary">{data.rawStatus}</span>
          )}
        </div>
        <p className="mt-1 text-xs text-secondary">
          {data.source} · {formatBytes(data.sizeBytes)} · v{data.version}
        </p>
        <p className="mt-0.5 text-xs text-secondary">
          Channel: {channelName} · updated {formatDate(data.updatedAt)}
        </p>
      </header>

      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          close();
          router.push(`/knowledge/${data.id}`);
        }}
      >
        <BookOpen aria-hidden className="size-4" strokeWidth={1.5} />
        Open document
      </Button>

      {canEdit ? (
        <section aria-labelledby="inspector-doc-actions" className="flex flex-col gap-2">
          <h3
            id="inspector-doc-actions"
            className="text-[11px] font-semibold uppercase tracking-wider text-secondary"
          >
            Manage
          </h3>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              loading={reindexPending === data.id}
              onClick={() => reindex(data.id)}
            >
              <RefreshCw aria-hidden className="size-4" strokeWidth={1.5} />
              Re-ingest
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={deletePending === data.id}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 aria-hidden className="size-4" strokeWidth={1.5} />
              Delete
            </Button>
          </div>
          <Select
            label="Assign to channel"
            items={(channels.data ?? []).map((channel) => ({
              value: channel.id,
              label: channel.name,
            }))}
            value={data.channelId ?? ''}
            onValueChange={(value) => {
              if (value !== data.channelId) assign(data.id, value, data.channelId);
            }}
            loading={channels.isPending || assignPending === data.id}
          />
        </section>
      ) : null}

      <section aria-labelledby="inspector-doc-versions">
        <h3
          id="inspector-doc-versions"
          className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-secondary"
        >
          Versions
        </h3>
        {versions.isPending ? (
          <Skeleton height={96} />
        ) : versions.isError ? (
          <ErrorState
            scope="section"
            title="Couldn’t load the versions"
            onRetry={() => void versions.refetch()}
          />
        ) : (
          <VersionsTimeline
            versions={versions.data}
            currentVersion={data.version}
            currentStatus={data.status}
          />
        )}
      </section>

      <Dialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this document?"
        description="Soft delete — the source stops serving retrieval for its channel."
        width="form"
        primaryAction={
          <Button
            variant="danger"
            loading={deletePending === data.id}
            onClick={() =>
              deleteDocument(data.id, () => {
                setConfirmDelete(false);
                close();
              })
            }
          >
            Delete document
          </Button>
        }
        secondaryAction={
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
        }
      >
        <p className="text-sm text-secondary">
          “{data.title}” ({data.source}) will be removed from {channelName}.
        </p>
      </Dialog>
    </div>
  );
}
