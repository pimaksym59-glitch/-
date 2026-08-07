'use client';

/**
 * AnalyticsView (FS11 T-FS11.5 — D3 §12 composition).
 *
 * The hierarchy is D3 §12's own and is not cosmetic: **reliable panels first**
 * (cost, quality, trends, the period report), engagement **gated** beside them,
 * and every panel carrying its own provenance (§R11.9). What the contract
 * cannot back — anomalies, forecasts, recommendations, experiments, system
 * health, live counters — renders as named seams (`AnalyticsHonesty`), never
 * simulated.
 *
 * **Queries are owned here; charts are not.** The five reads are cheap and this
 * component needs their VMs for the export and the AI panel, so the hooks are
 * eager and every chart-bearing panel is `dynamic()` (plan §3.1/§3.6). The visx
 * family is reached only through the frozen `chart/lazy` entrypoint.
 *
 * State ownership (plan §3.4): the range/facet/period/inspector live in the URL
 * (nuqs), server data lives in Query, and the only component state is ephemeral
 * (focus). Nothing is owned by Query and Zustand at once.
 *
 * RBAC: every role reads this screen (the API_SPEC matrix grants Analytics/Cost
 * to all five), so there is no route PATCH; the AI panel gates on
 * `content.edit` at the call site (SEC-7).
 */
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import type { ChannelVM } from '@/entities/channel';
import { useChannels } from '@/entities/channel';
import {
  useCostBy,
  useQualityPanel,
  useRangeSnapshot,
  useReportPanel,
  useTrendsPanel,
  isPanelEmpty,
  type PanelVM,
} from '@/entities/analytics-report';
import {
  describeRange,
  RangeControls,
  shiftRange,
  useAnalyticsRange,
} from '@/features/filter-analytics';
import { isTextEntryTarget } from '@/shared/config/shortcuts';
import { useInspector } from '@/shared/hooks';
import { useUiStore, selectActiveChannel } from '@/shared/lib/store';
import { useCan } from '@/shared/providers';
import { ErrorState } from '@/shared/ui/error-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { AnalyticsEmpty } from './AnalyticsEmpty';
import { AnalyticsHonesty } from './AnalyticsHonesty';
import { MetricRow } from './MetricRow';

/** Every chart-bearing or below-the-fold panel is LAZY (plan §3.1). */
const CostPanel = dynamic(() => import('./CostPanel').then((m) => m.CostPanel), {
  loading: () => <Skeleton height={280} />,
});
const QualityPanel = dynamic(() => import('./QualityPanel').then((m) => m.QualityPanel), {
  loading: () => <Skeleton height={220} />,
});
const TrendsPanel = dynamic(() => import('./TrendsPanel').then((m) => m.TrendsPanel), {
  loading: () => <Skeleton height={280} />,
});
const ReportPanel = dynamic(() => import('./ReportPanel').then((m) => m.ReportPanel), {
  loading: () => <Skeleton height={220} />,
});
const ExportMenu = dynamic(() => import('@/features/export-analytics').then((m) => m.ExportMenu), {
  loading: () => null,
});
const ExplainMetricsPanel = dynamic(
  () => import('@/features/explain-metrics').then((m) => m.ExplainMetricsPanel),
  { loading: () => <Skeleton height={120} /> },
);

export interface AnalyticsInitial {
  /** null = the server-side channels fetch failed → the client island refetches. */
  readonly channels: readonly ChannelVM[] | null;
  /** The channel AND range the server-side data was fetched for (FS5 rule). */
  readonly forChannelId: string | null;
  readonly forRange: { readonly from: string | null; readonly to: string | null } | null;
  readonly snapshot: PanelVM | null;
  readonly cost: PanelVM | null;
}

function panelState(query: {
  isPending: boolean;
  isError: boolean;
  data: PanelVM | undefined;
}): 'loading' | 'error' | 'empty' | 'ready' {
  if (query.isPending) return 'loading';
  if (query.isError) return 'error';
  if (query.data && isPanelEmpty(query.data)) return 'empty';
  return 'ready';
}

export function AnalyticsView({
  initial,
  today,
}: {
  readonly initial: AnalyticsInitial;
  /** The browser day, resolved by the page so range maths stays pure. */
  readonly today: string;
}): React.ReactElement {
  const can = useCan();
  const { inspect } = useInspector();
  const view = useAnalyticsRange(today);
  const channels = useChannels(initial.channels ?? undefined);
  const activeChannelId = useUiStore(selectActiveChannel);
  const setActiveChannel = useUiStore((state) => state.setActiveChannel);
  const [explainOpen, setExplainOpen] = useState(false);

  const list = channels.data ?? [];
  const active: ChannelVM | null =
    list.find((channel) => channel.id === activeChannelId) ?? list[0] ?? null;

  useEffect(() => {
    if (!activeChannelId && active) setActiveChannel(active.id);
  }, [activeChannelId, active, setActiveChannel]);

  // Server seeds apply ONLY to the channel AND range they were fetched for —
  // the FS5 cross-channel lesson, extended with the range dimension.
  const seeded =
    initial.forChannelId !== null &&
    active !== null &&
    initial.forChannelId === active.id &&
    initial.forRange?.from === view.range.from &&
    initial.forRange?.to === view.range.to;

  const snapshot = useRangeSnapshot(
    active?.id ?? null,
    view.range,
    seeded && initial.snapshot ? initial.snapshot : undefined,
  );
  const cost = useCostBy(
    view.groupBy,
    view.range,
    seeded && view.groupBy === 'day' && initial.cost ? initial.cost : undefined,
  );
  const quality = useQualityPanel(view.range);
  const trends = useTrendsPanel(view.range);
  const report = useReportPanel(view.period);

  // `[` / `]` shift the window by its own length; `e` opens export; `r` focuses
  // the range controls. Rows are registered in the lazy catalogue.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTextEntryTarget(event.target)) return;
      if (event.key === '[') {
        event.preventDefault();
        view.setRange(shiftRange(view.range, -1));
      } else if (event.key === ']') {
        event.preventDefault();
        view.setRange(shiftRange(view.range, 1));
      } else if (event.key === 'r') {
        event.preventDefault();
        document.querySelector<HTMLInputElement>('input[type="date"]')?.focus();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [view]);

  // Everything the export and the AI panel may read: the loaded series/metrics.
  const loadedSeries = useMemo(
    () => [...(cost.data?.series ?? []), ...(trends.data?.series ?? [])],
    [cost.data, trends.data],
  );
  const loadedMetrics = useMemo(
    () => [...(quality.data?.metrics ?? []), ...(report.data?.metrics ?? [])],
    [quality.data, report.data],
  );

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
  if (list.length === 0) return <AnalyticsEmpty />;
  if (!active) return <Skeleton height={240} />;

  const rangeLabel = describeRange(view.range);
  const canExplain = can('content.edit');

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-primary">Analytics</h1>
            <p className="mt-1 text-sm text-secondary">
              {active.name} · {rangeLabel}. Cost, quality and volume are measured internally and
              always available; engagement needs a stats adapter.
            </p>
          </div>
          <ExportMenu
            series={loadedSeries}
            filename={`analytics-${active.id}-${view.range.from ?? 'start'}-${view.range.to ?? 'end'}.csv`}
            rangeLabel={rangeLabel}
          />
        </div>
        <RangeControls range={view.range} today={today} onChange={view.setRange} />
      </header>

      <MetricRow
        panel={snapshot.data}
        isPending={snapshot.isPending}
        isError={snapshot.isError}
        onRetry={() => void snapshot.refetch()}
        onInspect={(key) => inspect({ type: 'datapoint', id: key })}
      />

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
        <CostPanel
          panel={cost.data}
          state={panelState(cost)}
          groupBy={view.groupBy}
          onGroupBy={view.setGroupBy}
          onRetry={() => void cost.refetch()}
        />
        <TrendsPanel
          panel={trends.data}
          state={panelState(trends)}
          onRetry={() => void trends.refetch()}
        />
        <QualityPanel
          panel={quality.data}
          state={panelState(quality)}
          onRetry={() => void quality.refetch()}
          onInspect={(key) => inspect({ type: 'datapoint', id: key })}
        />
        <ReportPanel
          panel={report.data}
          state={panelState(report)}
          period={view.period}
          onPeriod={view.setPeriod}
          onRetry={() => void report.refetch()}
          onInspect={(key) => inspect({ type: 'datapoint', id: key })}
        />
      </div>

      {canExplain ? (
        explainOpen ? (
          <ExplainMetricsPanel
            channelId={active.id}
            channelLabel={active.name}
            rangeLabel={rangeLabel}
            filters={cost.data?.provenance.filters ?? []}
            metrics={loadedMetrics}
            series={loadedSeries}
          />
        ) : (
          <button
            type="button"
            onClick={() => setExplainOpen(true)}
            className="self-start rounded-lg border border-border-default bg-surface px-4 py-2 text-sm text-primary transition-colors hover:bg-interactive-subtle"
          >
            Explain these numbers…
          </button>
        )
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <AnalyticsHonesty variant="anomalies" />
        <AnalyticsHonesty variant="forecast" />
        <AnalyticsHonesty variant="recommendations" />
        <AnalyticsHonesty variant="system" />
        <AnalyticsHonesty variant="liveness" className="xl:col-span-2" />
      </div>
    </div>
  );
}
