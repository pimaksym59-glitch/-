'use client';

/**
 * The identity-inputs panel (FS9 T-FS9.7 — D3 §9 "identity references via File
 * Upload"). **LAZY** — mounted when `?panel=references` is entered (plan
 * §3.1/§3.5). This is the part of D3 §9's composer the contract really backs:
 * `POST /actors/{id}/references` (§R6.1).
 *
 * The actor list is the FS8 entity, consumed unchanged (widgets compose
 * entities — `entities/image` never imports `entities/actor`, §2). Reference
 * COUNTS are not shown: the contract does not carry one and a zero would be a
 * claim (FE-RV-12 asks whether the live wire exposes it).
 */
import { Users } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import type { ActorVM } from '@/entities/actor';
import { useInspector } from '@/shared/hooks';
import { useCan } from '@/shared/providers';
import { Button } from '@/shared/ui/button';
import { ErrorState } from '@/shared/ui/error-state';
import { Skeleton } from '@/shared/ui/skeleton';

const UploadReferencesDialog = dynamic(
  () => import('@/features/upload-references').then((m) => m.UploadReferencesDialog),
  { loading: () => null },
);

export function ReferencesPanel({
  actors,
  channelId,
  isPending,
  isError,
  onRetry,
}: {
  readonly actors: readonly ActorVM[];
  readonly channelId: string | null;
  readonly isPending: boolean;
  readonly isError: boolean;
  readonly onRetry: () => void;
}): React.ReactElement {
  const can = useCan();
  const { inspect } = useInspector();
  const [uploadFor, setUploadFor] = useState<ActorVM | null>(null);
  const canEdit = can('content.edit');

  if (isPending) return <Skeleton height={200} />;
  if (isError) {
    return (
      <ErrorState scope="section" title="Couldn’t load this channel’s actors" onRetry={onRetry} />
    );
  }

  return (
    <section aria-labelledby="studio-references-heading" className="flex flex-col gap-4">
      <div>
        <h2
          id="studio-references-heading"
          className="flex items-center gap-2 text-sm font-semibold text-primary"
        >
          <Users aria-hidden className="size-4 text-secondary" strokeWidth={1.5} />
          Actor references
        </h2>
        <p className="mt-1 text-[13px] text-secondary">
          References are how the backend keeps an actor’s face consistent across generations (§R6.1)
          — identity conditioning, not a text description and not a seed.
        </p>
      </div>

      {actors.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-default p-4 text-[13px] text-secondary">
          This channel has no actors yet. Actors are defined with the channel’s visual identity —
          the Memory workspace shows the ones it has.
        </p>
      ) : (
        <ul aria-label="Actors" className="flex flex-col">
          {actors.map((actor) => (
            <li
              key={actor.id}
              className="flex flex-wrap items-center gap-3 border-b border-border-subtle py-3 last:border-b-0"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-primary">
                  {actor.name}
                </span>
                <span className="block truncate text-[13px] text-secondary">
                  {actor.appearanceDescription ?? 'No appearance notes yet'}
                </span>
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => inspect({ type: 'actor', id: actor.id })}
              >
                Inspect
              </Button>
              {canEdit ? (
                <Button size="sm" variant="secondary" onClick={() => setUploadFor(actor)}>
                  Add references
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {!canEdit ? (
        <p className="text-[13px] text-secondary">
          Your role reads this workspace — uploading references is an editor operation.
        </p>
      ) : null}

      {uploadFor ? (
        <UploadReferencesDialog
          open={uploadFor !== null}
          onOpenChange={(open) => {
            if (!open) setUploadFor(null);
          }}
          actor={uploadFor}
          channelId={channelId}
        />
      ) : null}
    </section>
  );
}
