'use client';

/**
 * Image inspector view (FS9 T-FS9.8) behind the unchanged FS2
 * `?inspect=image:<id>` contract. A compact projection of the record: status,
 * prompt, generation parameters and the write intents — the full history and
 * similarity report live in the detail pane, one click away.
 *
 * No preview is rendered (the contract serves no binary, §R6.8 / plan §5.2 D2)
 * and no safety chip exists (§5.2 D5). LAZY registry row: `InspectorPanel`
 * sits in the shell commons, so a static import would tax EVERY route's First
 * Load (the FS7/FS8 precedent, plan §3.6).
 */
import { useImage, ImageMetaList } from '@/entities/image';
import { RegenerateAction, useImageIntents } from '@/features/regenerate-image';
import { useCan } from '@/shared/providers';
import { Badge, StatusBadge } from '@/shared/ui/badge';
import { ErrorState } from '@/shared/ui/error-state';
import { Skeleton } from '@/shared/ui/skeleton';

export function ImageInspector({ id }: { readonly id: string }): React.ReactElement {
  const image = useImage(id);
  const can = useCan();
  const { regenerate, regeneratePending, deleteImage, deletePending } = useImageIntents(
    image.data?.channelId ?? null,
  );

  if (image.isPending) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Skeleton height={20} width="70%" />
        <Skeleton height={120} />
      </div>
    );
  }
  if (image.isError) {
    return (
      <div className="p-4">
        <ErrorState
          scope="section"
          title="Couldn’t load this image record"
          onRetry={() => void image.refetch()}
        />
      </div>
    );
  }

  const data = image.data;

  return (
    <div className="flex flex-col gap-4 p-4">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary">Image</p>
        <h2 className="mt-1 break-all text-sm font-semibold text-primary">{data.id}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {data.status !== null ? (
            <StatusBadge status={data.status} />
          ) : data.rawStatus !== null ? (
            <Badge tone="neutral">{data.rawStatus}</Badge>
          ) : null}
          {data.publishedAt ? <Badge tone="success">Published</Badge> : null}
        </div>
      </header>

      {data.prompt !== null ? (
        <section aria-labelledby="inspector-image-prompt">
          <h3
            id="inspector-image-prompt"
            className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-secondary"
          >
            Prompt
          </h3>
          <p className="rounded-lg border border-border-subtle bg-inset p-3 text-[13px] text-primary">
            {data.prompt}
          </p>
        </section>
      ) : null}

      <ImageMetaList image={data} />

      <p className="text-[13px] text-secondary">
        The image file itself is served by the backend’s object storage — the API contract exposes
        no media URL, so no preview is shown here.
      </p>

      {can('content.edit') ? (
        <RegenerateAction
          imageId={data.id}
          onRegenerate={regenerate}
          onDelete={(imageId) => deleteImage(imageId)}
          regenerating={regeneratePending === data.id}
          deleting={deletePending === data.id}
        />
      ) : null}
    </div>
  );
}
