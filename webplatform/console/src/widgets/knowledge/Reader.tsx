'use client';

/**
 * Document reader (FS7 — D3 §7, LAZY leaf: loaded on document selection, and
 * the markdown pipeline stays in its own chunk via the lazy entrypoint).
 * Renders the ingested text when the wire carries it; a metadata-only wire
 * gets the honest fallback, never an invented preview. Ingest truth: while a
 * document is queued/running the entity hook POLLS and this header says so.
 * The ask panel (streaming machinery) mounts only on intent.
 */
import { ArrowLeft, PanelRight, RefreshCw, Sparkles } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useDocument, useDocumentVersions, VersionsTimeline } from '@/entities/document';
import { useDocumentIntents } from '@/features/add-source';
import { useInspector } from '@/shared/hooks';
import { formatBytes, formatDate } from '@/shared/lib/format';
import { useCan } from '@/shared/providers';
import { StatusBadge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { ErrorState } from '@/shared/ui/error-state';
import { Markdown } from '@/shared/ui/markdown/lazy';
import { Skeleton } from '@/shared/ui/skeleton';
import { demoteMarkdownHeadings } from './markdown-embed';
import { RetrievalHonesty } from './RetrievalHonesty';

const AskDocumentPanel = dynamic(
  () => import('@/features/ask-document').then((m) => m.AskDocumentPanel),
  { loading: () => <Skeleton height={96} /> },
);

export function Reader({
  docId,
  channelName,
}: {
  readonly docId: string;
  readonly channelName: string;
}): React.ReactElement {
  const router = useRouter();
  const can = useCan();
  const { inspect } = useInspector();
  const doc = useDocument(docId);
  const versions = useDocumentVersions(docId);
  const { reindex, reindexPending } = useDocumentIntents();
  const [asking, setAsking] = useState(false);

  const canEdit = can('content.edit');

  if (doc.isPending) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton height={24} width="60%" />
        <Skeleton height={14} width="40%" />
        <Skeleton height={220} />
      </div>
    );
  }
  if (doc.isError) {
    return (
      <ErrorState
        scope="section"
        title="Couldn’t load this document"
        onRetry={() => void doc.refetch()}
      />
    );
  }

  const data = doc.data;

  return (
    <article className="flex min-w-0 flex-col gap-5">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 lg:hidden">
          <Button variant="ghost" size="sm" onClick={() => router.push('/knowledge')}>
            <ArrowLeft aria-hidden className="size-4" strokeWidth={1.5} />
            All documents
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="min-w-0 flex-1 text-xl font-semibold text-primary">{data.title}</h3>
          {data.status ? (
            <StatusBadge status={data.status} />
          ) : (
            <span className="text-xs text-secondary">{data.rawStatus}</span>
          )}
          <button
            type="button"
            aria-label={`Inspect ${data.title}`}
            onClick={() => inspect({ type: 'document', id: data.id })}
            className="inline-flex size-8 items-center justify-center rounded-md text-secondary transition-colors hover:bg-interactive-subtle hover:text-primary"
          >
            <PanelRight aria-hidden className="size-4" strokeWidth={1.5} />
          </button>
        </div>
        <p className="text-[13px] text-secondary">
          {data.source} · {formatBytes(data.sizeBytes)} · v{data.version} · updated{' '}
          {formatDate(data.updatedAt)} · scoped to {channelName}
        </p>
      </header>

      {data.ingesting ? (
        <p
          role="status"
          className="rounded-lg border border-border-default bg-inset p-3 text-sm text-secondary"
        >
          Ingesting — the status updates automatically while the worker chunks this source.
        </p>
      ) : null}

      {data.rawStatus === 'failed' ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-default bg-inset p-3">
          <p className="text-sm text-danger">
            Ingestion failed — this source is not retrievable yet.
          </p>
          {canEdit ? (
            <Button
              variant="secondary"
              size="sm"
              loading={reindexPending === data.id}
              onClick={() => reindex(data.id)}
            >
              <RefreshCw aria-hidden className="size-4" strokeWidth={1.5} />
              Re-ingest
            </Button>
          ) : null}
        </div>
      ) : null}

      {data.ready ? (
        data.content !== null ? (
          <div className="max-w-[72ch]">
            <Markdown>{demoteMarkdownHeadings(data.content)}</Markdown>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-border-default p-4 text-sm text-secondary">
            No text preview for this source type — the contract exposed metadata only. The backend
            still retrieves from its ingested chunks.
          </p>
        )
      ) : null}

      {canEdit && data.ready && data.content !== null ? (
        asking ? (
          <AskDocumentPanel doc={data} />
        ) : (
          <div>
            <Button variant="secondary" onClick={() => setAsking(true)}>
              <Sparkles aria-hidden className="size-4 text-ai" strokeWidth={1.5} />
              Ask about this document
            </Button>
          </div>
        )
      ) : null}

      <section aria-labelledby="reader-versions-heading">
        <h4
          id="reader-versions-heading"
          className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-secondary"
        >
          Versions
        </h4>
        {versions.isPending ? (
          <Skeleton height={72} />
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

      <RetrievalHonesty />
    </article>
  );
}
