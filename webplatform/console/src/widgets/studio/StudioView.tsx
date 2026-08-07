'use client';

/**
 * StudioView (FS9 T-FS9.5 — D3 §9 composition). The image workspace built from
 * what the frozen contract actually carries (plan §2): the records the pipeline
 * produced, their parameters, their attempt history, their §R6.4 similarity
 * report, the §R6.5 regeneration intent — and the §R6.1 identity references
 * this stage wires for the first time. What the contract cannot back —
 * free-form generation, the binary itself, attach-to-post, a safety verdict —
 * renders as honest seams (`StudioHonesty`), never simulated.
 *
 * Shell + grid paint instantly; the detail pane, the references panel, the
 * upload dialog and the AI panel are LAZY (plan §3.1). RBAC: the route opens on
 * `content.view`; writes and AI gate on `content.edit` per affordance (SEC-7).
 * Keyboard (D3 §9): `/` focus search · `r` regenerate the open record (guarded)
 * · `j/k/↵` on the grid. `⌘↵ generate` and `a accept` are deliberately NOT
 * registered — no contract call stands behind them.
 */
import { Images } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useQueryState } from 'nuqs';
import { useEffect, useRef, useState } from 'react';
import { useActors } from '@/entities/actor';
import type { ChannelVM } from '@/entities/channel';
import { useChannels } from '@/entities/channel';
import { filterImages, useImages, type ImageVM } from '@/entities/image';
import { useLocations } from '@/entities/location';
import { useImageIntents } from '@/features/regenerate-image';
import { isTextEntryTarget } from '@/shared/config/shortcuts';
import { useUiStore, selectActiveChannel } from '@/shared/lib/store';
import { useCan } from '@/shared/providers';
import { Button } from '@/shared/ui/button';
import { ErrorState } from '@/shared/ui/error-state';
import { SearchInput } from '@/shared/ui/search-input';
import { Skeleton } from '@/shared/ui/skeleton';
import { ImageGrid, STUDIO_PAGE_SIZE } from './ImageGrid';
import { StudioEmpty } from './StudioEmpty';
import { StudioHonesty } from './StudioHonesty';

/** Heavy leaves are LAZY (plan §3.1/§3.6 — one importer each). */
const ImageDetail = dynamic(() => import('./ImageDetail').then((m) => m.ImageDetail), {
  loading: () => (
    <div className="flex flex-col gap-3">
      <Skeleton height={24} width="55%" />
      <Skeleton height={14} width="35%" />
      <Skeleton height={200} />
    </div>
  ),
});
const ReferencesPanel = dynamic(() => import('./ReferencesPanel').then((m) => m.ReferencesPanel), {
  loading: () => <Skeleton height={200} />,
});

export interface StudioInitial {
  /** null = the server-side channels fetch failed → the client island refetches. */
  readonly channels: readonly ChannelVM[] | null;
  /** The channel the server-side list was fetched FOR (the FS5 lesson). */
  readonly forChannelId: string | null;
  readonly images: readonly ImageVM[] | null;
}

export function StudioView({
  initial,
  imageId,
}: {
  readonly initial: StudioInitial;
  readonly imageId: string | null;
}): React.ReactElement {
  const can = useCan();
  const router = useRouter();
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
  const images = useImages(active?.id ?? null, seeded ? (initial.images ?? undefined) : undefined);
  const actors = useActors(active?.id ?? null);
  const locations = useLocations(active?.id ?? null);

  const [q, setQ] = useQueryState('q');
  // Plan §3.5: switching panels is a real state change, so it PUSHES history and
  // Back reverses it (list filters stay `replace` — the FS8 `?scope=` lesson,
  // applied preventively).
  const [panel, setPanel] = useQueryState('panel', { history: 'push' });
  const [page, setPage] = useState(1);
  const searchRef = useRef<HTMLDivElement | null>(null);

  const canEdit = can('content.edit');
  const references = panel === 'references';
  const { regenerate } = useImageIntents(active?.id ?? null);

  // Screen-scoped keys (rows registered in shortcuts-catalog.ts; handlers live
  // here — the FS5/FS6/FS7/FS8 pattern). Chords never fire from text entry.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTextEntryTarget(event.target)) return;
      if (event.key === '/') {
        event.preventDefault();
        searchRef.current?.querySelector('input')?.focus();
      } else if (event.key === 'r' && canEdit && imageId !== null) {
        event.preventDefault();
        regenerate(imageId);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canEdit, imageId, regenerate]);

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
        <Images aria-hidden className="mx-auto size-8 text-tertiary" strokeWidth={1.5} />
        <h1 className="text-lg font-semibold text-primary">Image Studio</h1>
        <p className="text-sm text-secondary">
          Images belong to a channel — its actors, its scenes, its published posts. Create a channel
          first.
        </p>
      </div>
    );
  }
  if (!active) return <Skeleton height={240} />;

  const imageList = images.data ?? [];
  const visible = filterImages(imageList, q ?? '');
  const paged = visible.slice(0, page * STUDIO_PAGE_SIZE);
  const nothingYet = images.isSuccess && imageList.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Image Studio</h1>
          <p className="mt-1 text-sm text-secondary">
            {active.name} · what this channel has produced, how it was verified, and the references
            that keep its look consistent.
          </p>
        </div>
        {!canEdit ? (
          <p className="text-sm text-secondary">
            Your role reads this workspace — regenerating and uploading references are editor
            operations.
          </p>
        ) : null}
      </header>

      {/* Panel rail (D3 §9): results are real; references are the real inputs. */}
      <div role="group" aria-label="Studio panel" className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-pressed={!references}
          onClick={() => void setPanel(null)}
          className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
            !references
              ? 'bg-interactive-subtle text-primary'
              : 'text-secondary hover:bg-interactive-subtle hover:text-primary'
          }`}
        >
          Results
        </button>
        <button
          type="button"
          aria-pressed={references}
          onClick={() => void setPanel('references')}
          className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
            references
              ? 'bg-interactive-subtle text-primary'
              : 'text-secondary hover:bg-interactive-subtle hover:text-primary'
          }`}
        >
          References
        </button>
      </div>

      {references ? (
        <ReferencesPanel
          actors={actors.data ?? []}
          channelId={active.id}
          isPending={actors.isPending}
          isError={actors.isError}
          onRetry={() => void actors.refetch()}
        />
      ) : nothingYet ? (
        <div className="flex flex-col items-center gap-4">
          <StudioEmpty
            channelName={active.name}
            onOpenReferences={() => void setPanel('references')}
          />
          <StudioHonesty variant="generation" className="max-w-2xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[3fr_2fr]">
          <section
            aria-labelledby="studio-list-heading"
            className={
              imageId ? 'hidden min-w-0 flex-col gap-3 xl:flex' : 'flex min-w-0 flex-col gap-3'
            }
          >
            <h2 id="studio-list-heading" className="sr-only">
              Image records
            </h2>
            <div ref={searchRef}>
              <SearchInput
                label="Search image records"
                hideLabel
                placeholder="Filter by prompt, provider or style…  ( / )"
                value={q ?? ''}
                onChange={(e) => void setQ(e.target.value === '' ? null : e.target.value)}
              />
            </div>
            {images.isPending ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} height={220} />
                ))}
              </div>
            ) : images.isError ? (
              <ErrorState
                scope="section"
                title="Couldn’t load this channel’s images"
                onRetry={() => void images.refetch()}
              />
            ) : (
              <>
                <ImageGrid images={paged} activeImageId={imageId} query={q ?? ''} />
                {paged.length < visible.length ? (
                  <Button variant="secondary" onClick={() => setPage((p) => p + 1)}>
                    Load more ({visible.length - paged.length} remaining)
                  </Button>
                ) : null}
                {/* Below xl the detail pane (and its seam) is hidden, so the
                    honest explanation of why there is no “Generate” lives here
                    too — every viewport gets the truth (mobile E2E finding). */}
                {imageId === null ? (
                  <StudioHonesty variant="generation" className="xl:hidden" />
                ) : null}
              </>
            )}
          </section>

          <section aria-labelledby="studio-detail-heading" className="min-w-0">
            <h2 id="studio-detail-heading" className="sr-only">
              Image detail
            </h2>
            {imageId ? (
              <ImageDetail
                imageId={imageId}
                channelId={active.id}
                actors={actors.data ?? []}
                locations={locations.data ?? []}
                // A deleted record has no detail to return to. Route back to the
                // grid explicitly (`history.back()` could leave the workspace
                // entirely on a deep-linked entry — found by the E2E gate).
                onDeleted={() => router.push('/studio')}
              />
            ) : (
              <div className="hidden flex-col gap-4 xl:flex">
                <p className="rounded-lg border border-dashed border-border-default p-6 text-sm text-secondary">
                  Select a record to see the prompt it ran with, its generation parameters, every
                  attempt the backend made and the similarity report behind its verification.
                </p>
                <StudioHonesty variant="generation" />
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
