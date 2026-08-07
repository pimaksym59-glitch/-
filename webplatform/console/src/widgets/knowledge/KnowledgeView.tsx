'use client';

/**
 * KnowledgeView (FS7 T-FS7.4 — D3 §7 composition). Channel-isolated document
 * workspace: list pane (search/filter/`j/k/↵`) + reader pane (lazy) + the
 * Inspector via the shell. The shell + list paint instantly; every heavy leaf
 * (reader/markdown, add-source dialog, ask panel) is LAZY (plan §3.1). RBAC:
 * the route opens on `content.view`; uploads and AI actions gate on
 * `content.edit` per affordance (SEC-7) — read roles get honest copy, never
 * dead controls. Keyboard (D3 §7): `n` add source · `/` focus search ·
 * `j/k/↵` on the list.
 */
import { BookOpen } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useQueryState } from 'nuqs';
import { useEffect, useRef, useState } from 'react';
import type { ChannelVM } from '@/entities/channel';
import { useChannels } from '@/entities/channel';
import { filterDocuments, selectSources, useDocuments, type DocumentVM } from '@/entities/document';
import { isTextEntryTarget } from '@/shared/config/shortcuts';
import { useUiStore, selectActiveChannel } from '@/shared/lib/store';
import { useCan } from '@/shared/providers';
import { Button } from '@/shared/ui/button';
import { ErrorState } from '@/shared/ui/error-state';
import { SearchInput } from '@/shared/ui/search-input';
import { Select } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';
import { DocumentList } from './DocumentList';
import { KnowledgeEmpty } from './KnowledgeEmpty';
import { RetrievalHonesty } from './RetrievalHonesty';

/** Heavy leaves are LAZY (plan §3.1): the reader rides the markdown chunks;
 * the add-source dialog (FileUpload) mounts only on intent. */
const Reader = dynamic(() => import('./Reader').then((m) => m.Reader), {
  loading: () => (
    <div className="flex flex-col gap-3">
      <Skeleton height={24} width="60%" />
      <Skeleton height={14} width="40%" />
      <Skeleton height={220} />
    </div>
  ),
});
const AddSourceDialog = dynamic(
  () => import('@/features/add-source').then((m) => m.AddSourceDialog),
  { loading: () => null },
);

export interface KnowledgeInitial {
  /** null = the server-side channels fetch failed → the client island refetches. */
  readonly channels: readonly ChannelVM[] | null;
  /** The channel the server-side documents were fetched FOR (FS5 lesson). */
  readonly forChannelId: string | null;
  readonly documents: readonly DocumentVM[] | null;
}

const ALL_SOURCES = '__all__';

export function KnowledgeView({
  initial,
  docId,
}: {
  readonly initial: KnowledgeInitial;
  readonly docId: string | null;
}): React.ReactElement {
  const can = useCan();
  const channels = useChannels(initial.channels ?? undefined);
  const activeChannelId = useUiStore(selectActiveChannel);
  const setActiveChannel = useUiStore((state) => state.setActiveChannel);

  const list = channels.data ?? [];
  const active: ChannelVM | null =
    list.find((channel) => channel.id === activeChannelId) ?? list[0] ?? null;

  useEffect(() => {
    if (!activeChannelId && active) setActiveChannel(active.id);
  }, [activeChannelId, active, setActiveChannel]);

  // Channel-scoped seeds apply ONLY to the channel the server fetched for.
  const seeded = active !== null && initial.forChannelId === active.id;
  const documents = useDocuments(
    active?.id ?? null,
    seeded ? (initial.documents ?? undefined) : undefined,
  );

  const [q, setQ] = useQueryState('q');
  const [source, setSource] = useQueryState('source');
  const [addOpen, setAddOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement | null>(null);

  const canEdit = can('content.edit');

  // Screen-scoped keys (registry entries in shortcuts.ts; handlers live here —
  // the FS5/FS6 pattern). Chords never fire from text entry.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTextEntryTarget(event.target)) return;
      if (event.key === 'n' && canEdit) {
        event.preventDefault();
        setAddOpen(true);
      } else if (event.key === '/') {
        event.preventDefault();
        searchRef.current?.querySelector('input')?.focus();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canEdit]);

  if (channels.isPending) return <Skeleton height={240} />;
  if (channels.isError) {
    return (
      <ErrorState
        scope="page"
        title="Couldn’t load your channels"
        onRetry={() => void channels.refetch()}
      />
    );
  }
  if (list.length === 0) {
    return (
      <div className="flex flex-col gap-2 px-6 py-16 text-center">
        <BookOpen aria-hidden className="mx-auto size-8 text-tertiary" strokeWidth={1.5} />
        <h1 className="text-lg font-semibold text-primary">Knowledge</h1>
        <p className="text-sm text-secondary">
          Knowledge is scoped per channel. Create a channel first, then teach its AI here.
        </p>
      </div>
    );
  }
  if (!active) return <Skeleton height={240} />;

  const docs = documents.data ?? [];
  const sources = selectSources(docs);
  const sourceFilter = source && source !== ALL_SOURCES ? source : null;
  const visible = filterDocuments(docs, q ?? '', sourceFilter);
  const showEmpty = documents.isSuccess && docs.length === 0;

  const listPane = (
    <section aria-labelledby="knowledge-list-heading" className="flex min-w-0 flex-col gap-3">
      <h2 id="knowledge-list-heading" className="sr-only">
        Documents
      </h2>
      <div ref={searchRef}>
        <SearchInput
          label="Search documents"
          hideLabel
          placeholder="Search loaded documents…  ( / )"
          value={q ?? ''}
          onChange={(e) => void setQ(e.target.value === '' ? null : e.target.value)}
        />
      </div>
      {sources.length > 1 ? (
        <Select
          label="Source"
          hideLabel
          items={[
            { value: ALL_SOURCES, label: 'All sources' },
            ...sources.map((s) => ({ value: s, label: s })),
          ]}
          value={source ?? ALL_SOURCES}
          onValueChange={(value) => void setSource(value === ALL_SOURCES ? null : value)}
        />
      ) : null}
      {documents.isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} height={56} />
          ))}
        </div>
      ) : documents.isError ? (
        <ErrorState
          scope="section"
          title="Couldn’t load the documents"
          onRetry={() => void documents.refetch()}
        />
      ) : visible.length === 0 && docs.length > 0 ? (
        <p className="rounded-lg border border-dashed border-border-default p-4 text-sm text-secondary">
          No document matches “{q ?? ''}”. This searches the loaded list — retrieval is the
          backend’s job.
        </p>
      ) : (
        <DocumentList documents={visible} activeDocId={docId} />
      )}
    </section>
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Knowledge</h1>
          <p className="mt-1 text-sm text-secondary">
            {active.name} · documents this channel’s AI retrieves from, isolated per channel.
          </p>
        </div>
        {canEdit ? (
          <Button onClick={() => setAddOpen(true)}>Add source</Button>
        ) : (
          <p className="text-sm text-secondary">
            Your role reads this workspace — uploads and AI actions are editor operations.
          </p>
        )}
      </header>

      {showEmpty ? (
        <KnowledgeEmpty canEdit={canEdit} onAddSource={() => setAddOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(280px,2fr)_3fr]">
          {/* Mobile: one pane at a time (list ⇄ reader); desktop: both. */}
          <div className={docId ? 'hidden lg:block' : undefined}>{listPane}</div>
          <section aria-labelledby="knowledge-reader-heading" className="min-w-0">
            <h2 id="knowledge-reader-heading" className="sr-only">
              Document reader
            </h2>
            {docId ? (
              <Reader docId={docId} channelName={active.name} />
            ) : (
              <div className="hidden flex-col gap-4 lg:flex">
                <p className="rounded-lg border border-dashed border-border-default p-6 text-sm text-secondary">
                  Select a document to read it here. <kbd className="font-mono">↵</kbd> inspects,
                  “Open” reads.
                </p>
                <RetrievalHonesty />
              </div>
            )}
          </section>
        </div>
      )}

      {addOpen ? (
        <AddSourceDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          channelId={active.id}
          channelName={active.name}
        />
      ) : null}
    </div>
  );
}
