'use client';

/**
 * Shared chrome for every analytics panel (FS11 T-FS11.5).
 *
 * It exists to make §R11.9 unavoidable: **no panel renders without stating its
 * own provenance** — which endpoint answered, which filters this console
 * actually sent, when the browser received it, and the algorithm version *only
 * if the wire carries one*. Where the backend reports none, the whisper says
 * so rather than leaving a confident blank (plan §5.2 D8).
 *
 * It also owns per-panel isolation: each panel renders its own skeleton, its
 * own error card with retry and its own honest empty state, so one failing
 * panel never breaks the page (the FS5 MetricTiles precedent).
 */
import type { ProvenanceVM } from '@/entities/analytics-report';
import { ErrorState } from '@/shared/ui/error-state';
import { Skeleton } from '@/shared/ui/skeleton';

export function ProvenanceWhisper({
  provenance,
}: {
  readonly provenance: ProvenanceVM;
}): React.ReactElement {
  const parts = [
    provenance.endpoint,
    provenance.filters.join(' · '),
    provenance.algorithmVersion === null
      ? 'no algorithm version reported'
      : `algorithm ${provenance.algorithmVersion}`,
    `fetched ${provenance.fetchedAt.slice(11, 16)} UTC`,
  ];
  return (
    <p className="text-[12px] text-secondary" data-testid="panel-provenance">
      {parts.join(' · ')}
    </p>
  );
}

export function PanelFrame({
  id,
  title,
  description,
  state,
  onRetry,
  provenance,
  actions,
  children,
}: {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly state: 'loading' | 'error' | 'empty' | 'ready';
  readonly onRetry?: () => void;
  readonly provenance?: ProvenanceVM;
  readonly actions?: React.ReactNode;
  readonly children?: React.ReactNode;
}): React.ReactElement {
  const headingId = `analytics-panel-${id}`;
  return (
    <section
      aria-labelledby={headingId}
      data-panel={id}
      className="flex min-w-0 flex-col gap-3 rounded-xl border border-border-default bg-surface p-4"
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 id={headingId} className="text-sm font-semibold text-primary">
            {title}
          </h2>
          {description ? <p className="mt-1 text-[13px] text-secondary">{description}</p> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </header>

      {state === 'loading' ? (
        <Skeleton height={200} />
      ) : state === 'error' ? (
        <ErrorState
          scope="section"
          title={`Couldn’t load ${title.toLowerCase()}`}
          {...(onRetry ? { onRetry } : {})}
        />
      ) : state === 'empty' ? (
        <p className="rounded-lg border border-dashed border-border-default p-6 text-sm text-secondary">
          No data for this range yet. Widen the range, or check back once the pipeline has run.
        </p>
      ) : (
        children
      )}

      {provenance && state !== 'loading' ? <ProvenanceWhisper provenance={provenance} /> : null}
    </section>
  );
}
