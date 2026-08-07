'use client';

/**
 * Actor detail (FS8 — D3 §8, LAZY leaf). The channel's VISUAL identity, kept
 * strictly apart from the persona's voice (Persona ≠ Actor, §R4.7). READ-ONLY
 * in FS8: reference upload is a generation input (§R6.1) owned by FS9, and no
 * fake affordance stands in for it. Generation internals (face embedding,
 * reference folder) are not part of the ViewModel at all.
 */
import { X } from 'lucide-react';
import { useActor } from '@/entities/actor';
import { ErrorState } from '@/shared/ui/error-state';
import { Skeleton } from '@/shared/ui/skeleton';

function Row({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string | null;
}): React.ReactElement | null {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5 border-b border-border-subtle py-2 last:border-b-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-secondary">{label}</dt>
      <dd className="text-sm text-primary">{value}</dd>
    </div>
  );
}

export function ActorDetail({
  actorId,
  onClose,
}: {
  readonly actorId: string;
  readonly onClose: () => void;
}): React.ReactElement {
  const actor = useActor(actorId);

  if (actor.isPending) return <Skeleton height={180} />;
  if (actor.isError) {
    return (
      <ErrorState
        scope="section"
        title="Couldn’t load this actor"
        onRetry={() => void actor.refetch()}
      />
    );
  }

  const data = actor.data;
  const physique = [data.gender, data.age !== null ? `${data.age}` : null, data.build]
    .filter(Boolean)
    .join(' · ');

  return (
    <article className="flex min-w-0 flex-col gap-4">
      <header className="flex flex-wrap items-center gap-2">
        <h3 className="min-w-0 flex-1 text-xl font-semibold text-primary">{data.name}</h3>
        <button
          type="button"
          aria-label="Close actor detail"
          onClick={onClose}
          className="inline-flex size-8 items-center justify-center rounded-md text-secondary transition-colors hover:bg-interactive-subtle hover:text-primary"
        >
          <X aria-hidden className="size-4" strokeWidth={1.5} />
        </button>
      </header>

      <dl className="flex flex-col rounded-lg border border-border-subtle px-3">
        <Row label="Physique" value={physique === '' ? null : physique} />
        <Row label="Hair" value={[data.hair, data.hairColor].filter(Boolean).join(', ') || null} />
        <Row label="Eyes" value={data.eyes} />
        <Row label="Clothing style" value={data.clothingStyle} />
        <Row label="Appearance" value={data.appearanceDescription} />
        <Row label="Prompt description" value={data.promptDescription} />
      </dl>

      <p className="text-[13px] text-secondary">
        The visual identity used when this channel generates images. Reference images and their
        upload live with the Image Studio — not here.
      </p>
    </article>
  );
}
