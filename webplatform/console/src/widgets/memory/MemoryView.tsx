'use client';

/**
 * MemoryView (FS8 T-FS8.5 — D3 §8 composition). "Why does it write like this?"
 * answered from the memory levels the frozen contract exposes (§R9.1):
 * **Persona** (writing identity + Style Memory §R9.12), **Actors** (visual
 * identity — Persona ≠ Actor) and **Published posts** (content memory). The
 * levels the contract does NOT expose — trace, pin/exclude, Global scope, raw
 * memory rows — render as honest seams (`MemoryHonesty`), never simulated.
 *
 * Shell + grouped list paint instantly; every detail pane, the edit dialog and
 * the AI panel are LAZY (plan §3.1). RBAC: the route opens on `content.view`;
 * writes and AI gate on `content.edit` per affordance (SEC-7).
 * Keyboard (D3 §8): `/` focus search · `e` edit persona (guarded) · `j/k/↵`.
 */
import { Brain } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useQueryState } from 'nuqs';
import { useEffect, useRef, useState } from 'react';
import { useActors, type ActorVM } from '@/entities/actor';
import type { ChannelVM } from '@/entities/channel';
import { useChannels } from '@/entities/channel';
import { filterPersonas, usePersonas, type PersonaVM } from '@/entities/persona';
import { isTextEntryTarget } from '@/shared/config/shortcuts';
import { useUiStore, selectActiveChannel } from '@/shared/lib/store';
import { useCan } from '@/shared/providers';
import { ErrorState } from '@/shared/ui/error-state';
import { SearchInput } from '@/shared/ui/search-input';
import { Skeleton } from '@/shared/ui/skeleton';
import { MemoryEmpty } from './MemoryEmpty';
import { MemoryGroupList } from './MemoryGroupList';
import { MemoryHonesty } from './MemoryHonesty';

/** Heavy leaves are LAZY (plan §3.1/§3.6 — one importer each). */
const PersonaDetail = dynamic(() => import('./PersonaDetail').then((m) => m.PersonaDetail), {
  loading: () => (
    <div className="flex flex-col gap-3">
      <Skeleton height={24} width="55%" />
      <Skeleton height={14} width="35%" />
      <Skeleton height={200} />
    </div>
  ),
});
const ActorDetail = dynamic(() => import('./ActorDetail').then((m) => m.ActorDetail), {
  loading: () => <Skeleton height={180} />,
});
const PublishedMemoryList = dynamic(
  () => import('./PublishedMemoryList').then((m) => m.PublishedMemoryList),
  { loading: () => <Skeleton height={120} /> },
);
const EditPersonaDialog = dynamic(
  () => import('@/features/edit-persona').then((m) => m.EditPersonaDialog),
  { loading: () => null },
);

export interface MemoryInitial {
  /** null = the server-side channels fetch failed → the client island refetches. */
  readonly channels: readonly ChannelVM[] | null;
  /** The channel the server-side lists were fetched FOR (the FS5 lesson). */
  readonly forChannelId: string | null;
  readonly personas: readonly PersonaVM[] | null;
  readonly actors: readonly ActorVM[] | null;
}

export function MemoryView({
  initial,
  personaId,
}: {
  readonly initial: MemoryInitial;
  readonly personaId: string | null;
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
  const personas = usePersonas(
    active?.id ?? null,
    seeded ? (initial.personas ?? undefined) : undefined,
  );
  const actors = useActors(active?.id ?? null, seeded ? (initial.actors ?? undefined) : undefined);

  const [q, setQ] = useQueryState('q');
  // Plan §3.5: the scope switch is a real state change, so it PUSHES history
  // and Back reverses it (list filters stay `replace` — Back should leave the
  // screen, not unwind typing).
  const [scope, setScope] = useQueryState('scope', { history: 'push' });
  const [editing, setEditing] = useState<PersonaVM | null>(null);
  const [inspectedActorId, setInspectedActorId] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);

  const canEdit = can('content.edit');
  const globalScope = scope === 'global';

  const personaList = personas.data ?? [];
  const selectedPersona = personaId ? personaList.find((p) => p.id === personaId) : undefined;

  // Screen-scoped keys (rows registered in shortcuts-catalog.ts; handlers live
  // here — the FS5/FS6/FS7 pattern). Chords never fire from text entry.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTextEntryTarget(event.target)) return;
      if (event.key === '/') {
        event.preventDefault();
        searchRef.current?.querySelector('input')?.focus();
      } else if (event.key === 'e' && canEdit && selectedPersona) {
        event.preventDefault();
        setEditing(selectedPersona);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canEdit, selectedPersona]);

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
        <Brain aria-hidden className="mx-auto size-8 text-tertiary" strokeWidth={1.5} />
        <h1 className="text-lg font-semibold text-primary">Memory</h1>
        <p className="text-sm text-secondary">
          Memory is per channel — it grows from what a channel publishes. Create a channel first.
        </p>
      </div>
    );
  }
  if (!active) return <Skeleton height={240} />;

  const visiblePersonas = filterPersonas(personaList, q ?? '');
  const actorList = actors.data ?? [];
  const nothingYet =
    personas.isSuccess && actors.isSuccess && personaList.length === 0 && actorList.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Memory</h1>
          <p className="mt-1 text-sm text-secondary">
            {active.name} · the voice, the cast and what this channel has already published.
          </p>
        </div>
        {!canEdit ? (
          <p className="text-sm text-secondary">
            Your role reads this workspace — editing a persona is an editor operation.
          </p>
        ) : null}
      </header>

      {/* Scope rail (D3 §8): channel is real; global has no endpoint (§5.2 D1). */}
      <div role="group" aria-label="Memory scope" className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-pressed={!globalScope}
          onClick={() => void setScope(null)}
          className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
            !globalScope
              ? 'bg-interactive-subtle text-primary'
              : 'text-secondary hover:bg-interactive-subtle hover:text-primary'
          }`}
        >
          This channel
        </button>
        <button
          type="button"
          aria-pressed={globalScope}
          onClick={() => void setScope('global')}
          className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
            globalScope
              ? 'bg-interactive-subtle text-primary'
              : 'text-secondary hover:bg-interactive-subtle hover:text-primary'
          }`}
        >
          Global
        </button>
      </div>

      {globalScope ? (
        <MemoryHonesty variant="global" />
      ) : nothingYet ? (
        <MemoryEmpty channelName={active.name} />
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(300px,2fr)_3fr]">
          <section
            aria-labelledby="memory-list-heading"
            className={
              personaId ? 'hidden min-w-0 flex-col gap-3 lg:flex' : 'flex min-w-0 flex-col gap-3'
            }
          >
            <h2 id="memory-list-heading" className="sr-only">
              Memory entries
            </h2>
            <div ref={searchRef}>
              <SearchInput
                label="Search memory"
                hideLabel
                placeholder="Search this channel’s memory…  ( / )"
                value={q ?? ''}
                onChange={(e) => void setQ(e.target.value === '' ? null : e.target.value)}
              />
            </div>
            {personas.isPending || actors.isPending ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} height={56} />
                ))}
              </div>
            ) : personas.isError ? (
              <ErrorState
                scope="section"
                title="Couldn’t load this channel’s memory"
                onRetry={() => void personas.refetch()}
              />
            ) : (
              <MemoryGroupList
                personas={visiblePersonas}
                actors={actorList}
                activePersonaId={personaId}
                query={q ?? ''}
                onInspectActor={setInspectedActorId}
                publishedSlot={<PublishedMemoryList channelId={active.id} />}
              />
            )}
          </section>

          <section aria-labelledby="memory-detail-heading" className="min-w-0">
            <h2 id="memory-detail-heading" className="sr-only">
              Memory detail
            </h2>
            {personaId ? (
              <PersonaDetail
                personaId={personaId}
                channelName={active.name}
                {...(canEdit ? { onEdit: (persona: PersonaVM) => setEditing(persona) } : {})}
              />
            ) : inspectedActorId ? (
              <ActorDetail actorId={inspectedActorId} onClose={() => setInspectedActorId(null)} />
            ) : (
              <div className="hidden flex-col gap-4 lg:flex">
                <p className="rounded-lg border border-dashed border-border-default p-6 text-sm text-secondary">
                  Select a persona to see the voice it encodes — including the style features the
                  backend derived from what this channel published.
                </p>
                <MemoryHonesty variant="trace" />
              </div>
            )}
          </section>
        </div>
      )}

      {editing ? (
        <EditPersonaDialog
          open={editing !== null}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          persona={editing}
          channelId={active.id}
          onDone={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
