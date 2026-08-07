'use client';

/**
 * HealthView (FS12 T-FS12.10 — D3 §16). Liveness and readiness are separate
 * endpoints by requirement (§R12.10) and this screen keeps them separate.
 *
 * The two rules that shape it:
 *  - **Only what readiness names is rendered.** If the payload carries no
 *    per-dependency detail, the probe list is empty and the screen says so —
 *    nothing is derived from `/tasks`, `/analytics` or any other endpoint (the
 *    FS11 rule: a made-up metric is worse than a named absence).
 *  - **Unreachable is grey, never green.** An unrecognised state maps to
 *    `unknown` and shows the wire's own word (D3 §16's own instruction).
 *
 * Re-check is an honest refetch: the contract has no "run the probes" call, so
 * the button re-reads what the backend already knows and says exactly that.
 */
import { useEffect } from 'react';
import { sortProbes, useReadiness, type ReadinessVM } from '@/entities/probe';
import { isTextEntryTarget } from '@/shared/config/shortcuts';
import { useInspector } from '@/shared/hooks';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { ErrorState } from '@/shared/ui/error-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { HealthHonesty } from './HealthHonesty';
import { ProbeDot, PROBE_TONE_LABEL } from './ProbeDot';

export interface HealthInitial {
  readonly readiness: ReadinessVM | null;
}

export function HealthView({ initial }: { readonly initial: HealthInitial }): React.ReactElement {
  const query = useReadiness(initial.readiness ?? undefined);
  const { inspect } = useInspector();

  // `r` re-checks (D3 §16).
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTextEntryTarget(event.target)) return;
      if (event.key === 'r') {
        event.preventDefault();
        void query.refetch();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [query]);

  const readiness = query.data ?? null;
  const probes = readiness ? sortProbes(readiness.probes) : [];

  return (
    <section className="mx-auto flex w-full max-w-[900px] flex-col gap-6 px-6 py-8 md:px-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.015em] text-primary">
            Health
          </h1>
          <p className="mt-1 max-w-[70ch] text-sm text-secondary">
            Readiness reports whether dependencies are available; liveness only reports that the
            process is up (§R12.10). This screen reads readiness.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void query.refetch()}>
          Re-check
        </Button>
      </header>

      {query.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton height={72} />
          <Skeleton height={44} />
          <Skeleton height={44} />
        </div>
      ) : query.isError ? (
        <ErrorState
          title="Couldn’t read readiness"
          detail="GET /health/ready did not answer. That itself is a signal — the probe is unreachable, which is not the same as unhealthy."
          onRetry={() => void query.refetch()}
        />
      ) : readiness ? (
        <>
          <div className="onyx-raised flex items-center gap-3 rounded-xl border border-border-subtle p-5">
            <ProbeDot state={readiness.overall} />
            <div>
              <p className="text-sm font-medium text-primary">
                Overall: {PROBE_TONE_LABEL[readiness.overall]}
              </p>
              <p className="text-[13px] text-secondary">
                The endpoint reported “{readiness.rawOverall}”.
              </p>
            </div>
          </div>

          {readiness.hasProbeDetail ? (
            <ul aria-label="Dependency probes" className="flex flex-col gap-2">
              {probes.map((probe) => (
                <li
                  key={probe.name}
                  className="onyx-raised flex flex-wrap items-center gap-3 rounded-xl border border-border-subtle p-4"
                >
                  <ProbeDot state={probe.state} />
                  <span className="text-sm font-medium text-primary">{probe.name}</span>
                  <span className="text-[13px] text-secondary">
                    {probe.state === 'unknown'
                      ? `Reported “${probe.rawState}” — not a state this console recognises.`
                      : PROBE_TONE_LABEL[probe.state]}
                  </span>
                  {probe.detail ? (
                    <span className="text-[13px] text-secondary">· {probe.detail}</span>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto"
                    onClick={() => inspect({ type: 'probe', id: probe.name })}
                  >
                    Inspect
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Readiness reported no per-dependency detail"
              description="The endpoint answered, but its payload named no individual dependency. Nothing is inferred from other endpoints to fill the gap."
            />
          )}
        </>
      ) : null}

      <HealthHonesty />
    </section>
  );
}
