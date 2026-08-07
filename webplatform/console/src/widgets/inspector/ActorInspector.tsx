'use client';

/**
 * Actor inspector view (FS8 T-FS8.7) behind the unchanged FS2
 * `?inspect=actor:<id>` contract: the VISUAL identity, read-only this stage
 * (references are a generation input §R6.1 → FS9). Persona ≠ Actor: this view
 * never shows voice data.
 */
import { useActor } from '@/entities/actor';
import { Badge } from '@/shared/ui/badge';
import { ErrorState } from '@/shared/ui/error-state';
import { Skeleton } from '@/shared/ui/skeleton';

export function ActorInspector({ id }: { readonly id: string }): React.ReactElement {
  const actor = useActor(id);

  if (actor.isPending) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Skeleton height={20} width="70%" />
        <Skeleton height={120} />
      </div>
    );
  }
  if (actor.isError) {
    return (
      <div className="p-4">
        <ErrorState
          scope="section"
          title="Couldn’t load this actor"
          onRetry={() => void actor.refetch()}
        />
      </div>
    );
  }

  const data = actor.data;
  const physique = [data.gender, data.age !== null ? `${data.age}` : null, data.build]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="flex flex-col gap-4 p-4">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary">Actor</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h2 className="min-w-0 flex-1 text-sm font-semibold text-primary">{data.name}</h2>
          {data.archived ? <Badge tone="neutral">Archived</Badge> : null}
        </div>
        {physique !== '' ? <p className="mt-1 text-xs text-secondary">{physique}</p> : null}
      </header>

      {data.appearanceDescription ? (
        <p className="text-sm text-secondary">{data.appearanceDescription}</p>
      ) : null}

      {data.promptDescription ? (
        <section aria-labelledby="inspector-actor-prompt">
          <h3
            id="inspector-actor-prompt"
            className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-secondary"
          >
            Prompt description
          </h3>
          <p className="rounded-lg border border-border-subtle bg-inset p-3 text-[13px] text-primary">
            {data.promptDescription}
          </p>
        </section>
      ) : null}

      <p className="text-[13px] text-secondary">
        Reference images and their upload belong to the Image Studio — this view is read-only.
      </p>
    </div>
  );
}
