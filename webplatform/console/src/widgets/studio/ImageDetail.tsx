'use client';

/**
 * The image-record detail (FS9 T-FS9.5 — D3 §9 "result detail: prompt
 * disclosure, verification chips, seed, regen history"). **LAZY** — mounted on
 * selection only (plan §3.1/§3.6); the history and similarity panes ride this
 * chunk, and the AI panel is a further `dynamic()` boundary.
 *
 * Everything here is the record's own truth: prompt + negative disclosure, the
 * generation parameters, the scene (actor and location resolved by the WIDGET —
 * `entities/image` never imports a sibling entity), the §R6.5 attempt history
 * and the §R6.4 similarity report. The picture itself is not shown because the
 * contract serves no binary — the honesty surface says exactly that.
 */
import dynamic from 'next/dynamic';
import type { ActorVM } from '@/entities/actor';
import { useImage, useImageSimilarity, ImageMetaList } from '@/entities/image';
import { resolveLocationName, type LocationVM } from '@/entities/location';
import { RegenerateAction, useImageIntents } from '@/features/regenerate-image';
import { useCan } from '@/shared/providers';
import { Badge, StatusBadge } from '@/shared/ui/badge';
import { ErrorState } from '@/shared/ui/error-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { GenerationHistory } from './GenerationHistory';
import { SimilarityReport } from './SimilarityReport';
import { StudioHonesty } from './StudioHonesty';

/** The AI panel is a separate chunk — it loads on intent, not on selection. */
const ExplainVerificationPanel = dynamic(
  () => import('@/features/explain-verification').then((m) => m.ExplainVerificationPanel),
  { loading: () => <Skeleton height={120} /> },
);

export function ImageDetail({
  imageId,
  channelId,
  actors,
  locations,
  onDeleted,
}: {
  readonly imageId: string;
  readonly channelId: string | null;
  readonly actors: readonly ActorVM[];
  readonly locations: readonly LocationVM[];
  readonly onDeleted: () => void;
}): React.ReactElement {
  const can = useCan();
  const image = useImage(imageId);
  const similarity = useImageSimilarity(imageId);
  const { regenerate, regeneratePending, deleteImage, deletePending } = useImageIntents(channelId);

  if (image.isPending) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton height={24} width="55%" />
        <Skeleton height={14} width="35%" />
        <Skeleton height={200} />
      </div>
    );
  }
  if (image.isError) {
    return (
      <ErrorState
        scope="section"
        title="Couldn’t load this image record"
        onRetry={() => void image.refetch()}
      />
    );
  }

  const data = image.data;
  const canEdit = can('content.edit');
  const actorName = data.actorId
    ? (actors.find((actor) => actor.id === data.actorId)?.name ?? data.actorId)
    : null;
  const locationName = resolveLocationName(locations, data.locationId);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary">
            Image record
          </p>
          <h2 className="mt-1 break-all text-lg font-semibold text-primary">{data.id}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {data.status !== null ? (
              <StatusBadge status={data.status} />
            ) : data.rawStatus !== null ? (
              <Badge tone="neutral">{data.rawStatus}</Badge>
            ) : null}
            {data.publishedAt ? <Badge tone="success">Published</Badge> : null}
          </div>
        </div>
        {canEdit ? (
          <RegenerateAction
            imageId={data.id}
            onRegenerate={regenerate}
            onDelete={(id) => deleteImage(id, onDeleted)}
            regenerating={regeneratePending === data.id}
            deleting={deletePending === data.id}
          />
        ) : (
          <p className="text-[13px] text-secondary">
            Your role reads this workspace — regenerating is an editor operation.
          </p>
        )}
      </header>

      <StudioHonesty variant="preview" />
      {/* FS14 T-FS14.3: the `attach` seam was authored at FS9 and rendered
          NOWHERE — the journey audit (plan §1 T-FS14.2) found it dead. The
          record detail is where an "Attach to post" button would sit, and the
          absence belongs where the affordance would have been (the FS9 rule
          that a seam renders where the missing thing would be). LAZY chunk, so
          no route's First Load pays for it. */}
      <StudioHonesty variant="attach" />

      {data.prompt !== null || data.negativePrompt !== null ? (
        <section aria-labelledby="studio-prompt-heading" className="flex flex-col gap-2">
          <h3
            id="studio-prompt-heading"
            className="text-[11px] font-semibold uppercase tracking-wider text-secondary"
          >
            Prompt disclosure
          </h3>
          {data.prompt !== null ? (
            <p className="rounded-lg border border-border-subtle bg-inset p-3 text-[13px] text-primary">
              {data.prompt}
            </p>
          ) : null}
          {data.negativePrompt !== null ? (
            <p className="text-[13px] text-secondary">
              <span className="font-medium text-primary">Negative:</span> {data.negativePrompt}
            </p>
          ) : null}
        </section>
      ) : null}

      <section aria-labelledby="studio-params-heading" className="flex flex-col gap-2">
        <h3
          id="studio-params-heading"
          className="text-[11px] font-semibold uppercase tracking-wider text-secondary"
        >
          Generation parameters
        </h3>
        <ImageMetaList image={data} />
      </section>

      {actorName !== null || locationName !== null ? (
        <section aria-labelledby="studio-scene-heading" className="flex flex-col gap-2">
          <h3
            id="studio-scene-heading"
            className="text-[11px] font-semibold uppercase tracking-wider text-secondary"
          >
            Scene
          </h3>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-[13px]">
            {actorName !== null ? (
              <div className="contents">
                <dt className="text-secondary">Actor</dt>
                <dd className="min-w-0 break-words font-medium text-primary">{actorName}</dd>
              </div>
            ) : null}
            {locationName !== null ? (
              <div className="contents">
                <dt className="text-secondary">Location</dt>
                <dd className="min-w-0 break-words font-medium text-primary">{locationName}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}

      <section aria-labelledby="studio-history-heading" className="flex flex-col gap-2">
        <h3
          id="studio-history-heading"
          className="text-[11px] font-semibold uppercase tracking-wider text-secondary"
        >
          Generation history
        </h3>
        <GenerationHistory imageId={data.id} />
      </section>

      <section aria-labelledby="studio-similarity-heading" className="flex flex-col gap-2">
        <h3
          id="studio-similarity-heading"
          className="text-[11px] font-semibold uppercase tracking-wider text-secondary"
        >
          Similarity report
        </h3>
        <SimilarityReport imageId={data.id} />
      </section>

      {canEdit ? <ExplainVerificationPanel image={data} report={similarity.data ?? null} /> : null}
    </div>
  );
}
