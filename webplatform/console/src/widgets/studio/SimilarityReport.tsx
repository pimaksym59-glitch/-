'use client';

/**
 * The similarity report (FS9 T-FS9.5 — §R6.4). The backend's three-mechanism
 * cascade: perceptual hash ≠ scene metadata ≠ CLIP embedding. This is the
 * first REAL verification data the console has ever rendered.
 *
 * What it does NOT do: conclude. The console reports the numbers the backend
 * computed and groups them by mechanism; it never derives a "unique" or "safe"
 * verdict on the backend's behalf (plan §5.2 D5), and an unknown report key is
 * shown by its raw name rather than dropped (the §R9.12 discipline).
 * LAZY — it rides the detail chunk (plan §3.6).
 */
import { useImageSimilarity, type SimilarityMetricVM } from '@/entities/image';
import { ErrorState } from '@/shared/ui/error-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { StudioHonesty } from './StudioHonesty';

const MECHANISM_LABEL: Readonly<Record<'phash' | 'scene' | 'clip', string>> = {
  phash: 'Perceptual hash — near-duplicate detection',
  scene: 'Scene metadata — composition, camera, wardrobe',
  clip: 'CLIP embedding — semantic similarity',
};

function MetricRows({ metrics }: { readonly metrics: readonly SimilarityMetricVM[] }) {
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-[13px]">
      {metrics.map((metric) => (
        <div key={metric.key} className="contents">
          <dt className="text-secondary">
            {metric.label}
            {metric.unknown ? (
              <span className="ml-1 text-[11px] text-secondary">(raw key)</span>
            ) : null}
          </dt>
          <dd className="min-w-0 break-words font-medium text-primary">{metric.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SimilarityReport({ imageId }: { readonly imageId: string }): React.ReactElement {
  const report = useImageSimilarity(imageId);

  if (report.isPending) return <Skeleton height={160} />;
  if (report.isError) {
    return (
      <ErrorState
        scope="section"
        title="Couldn’t load the similarity report"
        onRetry={() => void report.refetch()}
      />
    );
  }

  const data = report.data;
  if (data.empty) {
    return (
      <p className="text-[13px] text-secondary">
        The backend returned no similarity metrics for this record.
      </p>
    );
  }

  const groups: readonly ('phash' | 'scene' | 'clip')[] = ['phash', 'scene', 'clip'];
  const other = data.metrics.filter((metric) => metric.mechanism === null);

  return (
    <div className="flex flex-col gap-4">
      {groups.map((mechanism) => {
        const metrics = data.metrics.filter((metric) => metric.mechanism === mechanism);
        if (metrics.length === 0) return null;
        return (
          <section key={mechanism} aria-labelledby={`similarity-${mechanism}`}>
            <h4
              id={`similarity-${mechanism}`}
              className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-secondary"
            >
              {MECHANISM_LABEL[mechanism]}
            </h4>
            <MetricRows metrics={metrics} />
          </section>
        );
      })}

      {other.length > 0 ? (
        <section aria-labelledby="similarity-other">
          <h4
            id="similarity-other"
            className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-secondary"
          >
            Other metrics the backend reported
          </h4>
          <MetricRows metrics={other} />
        </section>
      ) : null}

      <StudioHonesty variant="safety" />
    </div>
  );
}
