'use client';

/**
 * Memory entries grouped BY KIND (D3 §8 "scope → kind → entry → trace"), over
 * the memory levels the contract exposes (§R9.1): Persona · Actors · Published
 * posts. `j/k` move focus within a group, `↵`/click opens the entry (persona →
 * route segment per §3.5; actor → detail pane), the Inspector affordance uses
 * the FS2 `?inspect=` contract. Archived personas stay VISIBLE and labelled —
 * memory is history, and hiding it would be a lie.
 */
import { clsx } from 'clsx';
import { Brain, PanelRight, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { filterActors, type ActorVM } from '@/entities/actor';
import type { PersonaVM } from '@/entities/persona';
import { useInspector } from '@/shared/hooks';
import { Badge } from '@/shared/ui/badge';

function onRowKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number): void {
  if (event.key !== 'j' && event.key !== 'k') return;
  event.preventDefault();
  const next = event.key === 'j' ? index + 1 : index - 1;
  const target = event.currentTarget
    .closest('ul')
    ?.querySelector<HTMLButtonElement>(`button[data-row-index="${next}"]`);
  target?.focus();
}

export function MemoryGroupList({
  personas,
  actors,
  activePersonaId,
  query,
  onInspectActor,
  publishedSlot,
}: {
  readonly personas: readonly PersonaVM[];
  readonly actors: readonly ActorVM[];
  readonly activePersonaId: string | null;
  readonly query: string;
  readonly onInspectActor: (id: string) => void;
  readonly publishedSlot: React.ReactNode;
}): React.ReactElement {
  const router = useRouter();
  const { inspect } = useInspector();
  const visibleActors = filterActors(actors, query);

  return (
    <div className="flex flex-col gap-5">
      <section aria-labelledby="memory-group-persona">
        <h3
          id="memory-group-persona"
          className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-secondary"
        >
          <Brain aria-hidden className="size-3.5" strokeWidth={1.5} />
          Persona · the writing voice
        </h3>
        {personas.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border-default p-3 text-[13px] text-secondary">
            {query === ''
              ? 'No persona defined for this channel yet.'
              : `No persona matches “${query}”. This filters the loaded list.`}
          </p>
        ) : (
          <ul aria-label="Personas" className="flex flex-col">
            {personas.map((persona, index) => (
              <li
                key={persona.id}
                className="flex items-center gap-2 border-b border-border-subtle py-2 last:border-b-0"
              >
                <button
                  type="button"
                  data-row-index={index}
                  aria-current={persona.id === activePersonaId ? 'true' : undefined}
                  onClick={() => router.push(`/memory/${persona.id}`)}
                  onKeyDown={(event) => onRowKeyDown(event, index)}
                  className={clsx(
                    'flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-interactive-subtle focus-visible:bg-interactive-subtle',
                    persona.id === activePersonaId && 'bg-interactive-subtle',
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-primary">
                      {persona.name}
                    </span>
                    <span className="block truncate text-[13px] text-secondary">
                      {persona.mannerOfSpeech ?? persona.character ?? 'No voice notes yet'}
                    </span>
                  </span>
                  {persona.archived ? <Badge tone="neutral">Archived</Badge> : null}
                  {persona.styleFeatures.length > 0 ? (
                    <span className="shrink-0 text-[11px] text-secondary">
                      {persona.styleFeatures.length} style features
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  aria-label={`Inspect ${persona.name}`}
                  onClick={() => inspect({ type: 'persona', id: persona.id })}
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-secondary transition-colors hover:bg-interactive-subtle hover:text-primary"
                >
                  <PanelRight aria-hidden className="size-4" strokeWidth={1.5} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="memory-group-actor">
        <h3
          id="memory-group-actor"
          className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-secondary"
        >
          <Users aria-hidden className="size-3.5" strokeWidth={1.5} />
          Actors · the visual identity
        </h3>
        {visibleActors.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border-default p-3 text-[13px] text-secondary">
            {query === ''
              ? 'No actor defined for this channel yet.'
              : `No actor matches “${query}”.`}
          </p>
        ) : (
          <ul aria-label="Actors" className="flex flex-col">
            {visibleActors.map((actor, index) => (
              <li
                key={actor.id}
                className="flex items-center gap-2 border-b border-border-subtle py-2 last:border-b-0"
              >
                <button
                  type="button"
                  data-row-index={index}
                  onClick={() => onInspectActor(actor.id)}
                  onKeyDown={(event) => onRowKeyDown(event, index)}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-interactive-subtle focus-visible:bg-interactive-subtle"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-primary">
                      {actor.name}
                    </span>
                    <span className="block truncate text-[13px] text-secondary">
                      {actor.appearanceDescription ?? 'No appearance notes yet'}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`Inspect ${actor.name}`}
                  onClick={() => inspect({ type: 'actor', id: actor.id })}
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-secondary transition-colors hover:bg-interactive-subtle hover:text-primary"
                >
                  <PanelRight aria-hidden className="size-4" strokeWidth={1.5} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="memory-group-published">
        <h3
          id="memory-group-published"
          className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-secondary"
        >
          Published posts · what the channel has already said
        </h3>
        {publishedSlot}
      </section>
    </div>
  );
}
