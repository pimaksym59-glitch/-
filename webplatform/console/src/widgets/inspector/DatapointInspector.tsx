'use client';

/**
 * DatapointInspector (FS11 T-FS11.8 — D3 §12 "Inspector for a datapoint/period
 * detail", A3 "any entity opens in the Inspector").
 *
 * **It performs NO fetch.** The frozen contract has no per-datapoint endpoint,
 * so inventing one is out of the question — and re-requesting a panel from the
 * inspector would be a second source of truth for a number already on screen.
 * Instead it reads the SAME Query cache the panels filled, keyed by the SAME
 * URL state (`?from=&to=&group_by=&period=`), so what it shows is by
 * construction the value the user clicked.
 *
 * If the cache is cold (a deep link opened in a fresh tab before the panels
 * loaded), it says so plainly rather than showing a plausible number.
 *
 * Id grammar: `<panel>.<key>` — e.g. `quality.quality_score`,
 * `report.published`, `snapshot.cost`.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import {
  analyticsKeys,
  type CostGroupBy,
  type MetricEntryVM,
  type PanelVM,
  type ReportPeriod,
} from '@/entities/analytics-report';
import { formatCost, formatNumber } from '@/shared/lib/format';

interface Resolved {
  readonly label: string;
  readonly value: string;
  readonly unit: string | null;
  readonly panelLabel: string;
  readonly endpoint: string;
  readonly filters: readonly string[];
  readonly algorithmVersion: string | null;
  readonly fetchedAt: string;
  readonly rawKey: boolean;
}

function fromMetric(metric: MetricEntryVM, panel: PanelVM, panelLabel: string): Resolved {
  return {
    label: metric.label,
    value: metric.value === null ? '—' : String(metric.value),
    unit: metric.unit,
    panelLabel,
    endpoint: panel.provenance.endpoint,
    filters: panel.provenance.filters,
    algorithmVersion: panel.provenance.algorithmVersion,
    fetchedAt: panel.provenance.fetchedAt,
    rawKey: metric.rawKey,
  };
}

export function DatapointInspector({ id }: { readonly id: string }): React.ReactElement {
  const client = useQueryClient();
  const params = useSearchParams();

  const range = { from: params.get('from'), to: params.get('to') };
  const period = (params.get('period') ?? 'daily') as ReportPeriod;
  const groupBy = (params.get('group_by') ?? 'day') as CostGroupBy;

  const dot = id.indexOf('.');
  const panelId = dot === -1 ? id : id.slice(0, dot);
  const key = dot === -1 ? '' : id.slice(dot + 1);

  let resolved: Resolved | null = null;

  if (panelId === 'quality' || panelId === 'report') {
    const panel = client.getQueryData<PanelVM>(
      panelId === 'quality' ? analyticsKeys.quality(range) : analyticsKeys.report(period),
    );
    const metric = panel?.metrics.find((entry) => entry.key === key);
    if (panel && metric) {
      resolved = fromMetric(metric, panel, panelId === 'quality' ? 'Quality' : 'Period report');
    }
  } else if (panelId === 'snapshot') {
    // The snapshot key carries the channel id, which this URL does not, so the
    // cache is scanned rather than an id guessed — still no network call.
    const found = client
      .getQueriesData<PanelVM>({ queryKey: ['analytics', 'range'] })
      .map(([, value]) => value)
      .find((value): value is PanelVM => value !== undefined);
    const metric = found?.metrics.find((entry) => entry.key === key);
    if (found && metric) {
      resolved = {
        label: metric.label,
        value:
          metric.value === null
            ? '—'
            : metric.key === 'cost'
              ? formatCost(metric.value)
              : formatNumber(metric.value),
        unit: metric.unit,
        panelLabel: 'Channel snapshot',
        endpoint: found.provenance.endpoint,
        filters: found.provenance.filters,
        algorithmVersion: found.provenance.algorithmVersion,
        fetchedAt: found.provenance.fetchedAt,
        rawKey: metric.rawKey,
      };
    }
  } else if (panelId === 'cost') {
    const panel = client.getQueryData<PanelVM>(analyticsKeys.costBy(groupBy, range));
    const point = panel?.series[0]?.points.find((entry) => entry.key === key);
    if (panel && point) {
      resolved = {
        label: point.key,
        value: formatCost(point.value),
        unit: 'USD',
        panelLabel: panel.series[0]?.label ?? 'Cost',
        endpoint: panel.provenance.endpoint,
        filters: panel.provenance.filters,
        algorithmVersion: panel.provenance.algorithmVersion,
        fetchedAt: panel.provenance.fetchedAt,
        rawKey: false,
      };
    }
  }

  if (!resolved) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary">
          datapoint
        </p>
        <p className="break-all text-sm text-primary">{id}</p>
        <p className="text-[13px] text-secondary">
          This value is not loaded in this browser. The console never re-fetches a datapoint on its
          own — the contract has no per-datapoint endpoint — so open the panel it belongs to and the
          detail appears here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary">
          {resolved.panelLabel}
        </p>
        <h2 className="mt-1 text-sm font-semibold text-primary">
          {resolved.label}
          {resolved.rawKey ? (
            <span className="ml-2 text-[12px] font-normal text-secondary">(raw key)</span>
          ) : null}
        </h2>
      </div>

      <p className="font-mono text-2xl tabular-nums text-primary">
        {resolved.value}
        {resolved.unit ? (
          <span className="ml-1 text-sm text-secondary">{resolved.unit}</span>
        ) : null}
      </p>

      <dl className="flex flex-col gap-2 border-t border-border-subtle pt-3 text-[13px]">
        <div className="flex justify-between gap-4">
          <dt className="text-secondary">Endpoint</dt>
          <dd className="break-all text-right text-primary">{resolved.endpoint}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-secondary">Filters sent</dt>
          <dd className="text-right text-primary">
            {resolved.filters.length > 0 ? resolved.filters.join(' · ') : 'none'}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-secondary">Algorithm version</dt>
          <dd className="text-right text-primary">{resolved.algorithmVersion ?? 'not reported'}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-secondary">Fetched</dt>
          <dd className="text-right text-primary">{resolved.fetchedAt.slice(0, 16)} UTC</dd>
        </div>
      </dl>

      <p className="text-[12px] text-secondary">
        Read from what this page already loaded — no request was made to open this panel.
      </p>
    </div>
  );
}
