'use client';

/**
 * ProbeInspector (FS12) — one dependency's reported state. A pure projection of
 * the readiness response already in cache: there is no per-probe endpoint and
 * no probe history, so this view fetches nothing beyond the readiness query the
 * Health screen already owns.
 */
import { PROBE_STATE_LABELS, sortProbes, useReadiness } from '@/entities/probe';
import { ErrorState } from '@/shared/ui/error-state';
import { Skeleton } from '@/shared/ui/skeleton';

export function ProbeInspector({ id }: { readonly id: string }): React.ReactElement {
  const query = useReadiness();

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Skeleton height={20} width="60%" />
        <Skeleton height={80} />
      </div>
    );
  }
  if (query.isError || !query.data) {
    return (
      <div className="p-4">
        <ErrorState
          title="Couldn’t read readiness"
          detail="GET /health/ready did not answer."
          onRetry={() => void query.refetch()}
        />
      </div>
    );
  }

  const probe = sortProbes(query.data.probes).find((entry) => entry.name === id) ?? null;
  if (!probe) {
    return (
      <div className="p-4">
        <p className="text-sm text-primary">Readiness does not report a probe by this name.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <header>
        <h2 className="text-sm font-semibold text-primary">{probe.name}</h2>
        <p className="text-[13px] text-secondary">{PROBE_STATE_LABELS[probe.state]}</p>
      </header>
      <dl className="flex flex-col gap-2 text-[13px]">
        <div className="flex justify-between gap-4">
          <dt className="text-secondary">Reported value</dt>
          <dd className="font-mono text-primary">{probe.rawState}</dd>
        </div>
        {probe.detail ? (
          <div className="flex flex-col gap-1">
            <dt className="text-secondary">Detail</dt>
            <dd className="text-primary">{probe.detail}</dd>
          </div>
        ) : null}
      </dl>
      <p className="text-[13px] text-secondary">
        There is no probe history in the contract, so this is the current verdict only — not a
        trend, and not an uptime figure.
      </p>
    </div>
  );
}
