'use client';

/**
 * ProvidersView (FS12 T-FS12.11 — D3 §15), rebuilt on what the contract has.
 *
 * **There is no `/providers` endpoint.** Stage 3 §8 listed one as *(assumed via
 * services)*; the frozen contract refutes it, exactly as it refuted D4 §4's
 * `POST /images` at FS9. What exists is:
 *   - `GET /api-keys` — a slot inventory whose values are never returned;
 *   - `PUT /api-keys` — write-only rotation (the SEC-6 surface);
 *   - `GET /health/ready` — which §R12.10 says covers providers, **if** the
 *     payload names them.
 *
 * So this screen shows key slots and, where readiness actually names a
 * provider, its reported state. Capabilities, enable/disable, model routing,
 * usage and "test connection" have no call and are named seams.
 */
import { useState } from 'react';
import { countConfigured, useApiKeySlots, type ApiKeySlotVM } from '@/entities/api-key';
import { sortProbes, useReadiness, type ReadinessVM } from '@/entities/probe';
import dynamic from 'next/dynamic';
import { useRotateKey } from '@/features/rotate-key';

/** Lazy for the same measured reason as the other platform dialogs. */
const RotateKeyDialog = dynamic(
  () => import('@/features/rotate-key').then((m) => m.RotateKeyDialog),
  { loading: () => null },
);
import { useInspector } from '@/shared/hooks';
import { useCan } from '@/shared/providers';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { ErrorState } from '@/shared/ui/error-state';
import { Skeleton } from '@/shared/ui/skeleton';
// Imported by FILE, not through `@/widgets/health`'s barrel: that barrel also
// exports the `'use client'` HealthView, and FS11 measured what reaching a
// client module through a barrel costs the consuming route (plan §3.6, R1f).
// ProbeDot is a pure presentational leaf with no client directive of its own.
import { ProbeDot, PROBE_TONE_LABEL } from '@/widgets/health/ProbeDot';
import { ProvidersHonesty } from './ProvidersHonesty';

export interface ProvidersInitial {
  readonly slots: readonly ApiKeySlotVM[] | null;
  readonly readiness: ReadinessVM | null;
}

/** Only a probe whose name actually mentions the slot is shown beside it —
 *  nothing is inferred from an unrelated dependency (the FS11 rule). */
function probeFor(readiness: ReadinessVM | null, slot: ApiKeySlotVM) {
  if (!readiness) return null;
  const needle = slot.label.toLowerCase();
  return (
    sortProbes(readiness.probes).find((probe) => probe.name.toLowerCase().includes(needle)) ?? null
  );
}

export function ProvidersView({
  initial,
}: {
  readonly initial: ProvidersInitial;
}): React.ReactElement {
  const can = useCan();
  const canRotate = can('admin.providers.manage');
  const { inspect } = useInspector();
  const slotsQuery = useApiKeySlots(initial.slots ?? undefined);
  const readinessQuery = useReadiness(initial.readiness ?? undefined);
  const rotate = useRotateKey();
  const [rotating, setRotating] = useState<string | null>(null);

  const slots = slotsQuery.data ?? [];
  const counts = countConfigured(slots);

  return (
    <section className="mx-auto flex w-full max-w-[1000px] flex-col gap-6 px-6 py-8 md:px-8">
      <header>
        <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.015em] text-primary">
          Providers
        </h1>
        <p className="mt-1 max-w-[72ch] text-sm text-secondary">
          Keys are submitted and never returned (§R10.4). This console can tell you that a slot is
          configured — never which key is in it.
          {slots.length > 0
            ? ` ${String(counts.configured)} of ${String(slots.length)} configured${counts.unknown > 0 ? `, ${String(counts.unknown)} unknown` : ''}.`
            : ''}
        </p>
      </header>

      {slotsQuery.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton height={64} />
          <Skeleton height={64} />
        </div>
      ) : slotsQuery.isError ? (
        <ErrorState
          title="Couldn’t load key slots"
          detail="GET /api-keys did not answer."
          onRetry={() => void slotsQuery.refetch()}
        />
      ) : slots.length === 0 ? (
        <EmptyState
          title="No providers configured"
          description="Console runs on deterministic fakes until you add keys (§R2.10) — nothing is broken, and nothing is being called."
        />
      ) : (
        <ul aria-label="Provider key slots" className="flex flex-col gap-2">
          {slots.map((slot) => {
            const probe = probeFor(readinessQuery.data ?? null, slot);
            return (
              <li
                key={slot.id}
                className="onyx-raised flex flex-wrap items-center gap-3 rounded-xl border border-border-subtle p-4"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-primary">{slot.label}</span>
                    {slot.kind ? (
                      <span className="rounded-full border border-border-default px-2 py-0.5 text-[11px] text-secondary">
                        {slot.kind}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[13px] text-secondary">
                    {slot.configured === true
                      ? 'A key is stored for this slot.'
                      : slot.configured === false
                        ? 'No key stored — this provider runs on a deterministic fake.'
                        : 'The backend did not say whether a key is stored.'}
                    {probe ? '' : ' Readiness does not report this provider by name.'}
                  </p>
                </div>
                {probe ? (
                  <span className="flex items-center gap-2">
                    <ProbeDot state={probe.state} />
                    <span className="text-[13px] text-secondary">
                      {PROBE_TONE_LABEL[probe.state]}
                    </span>
                  </span>
                ) : null}
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => inspect({ type: 'key', id: slot.id })}
                  >
                    Inspect
                  </Button>
                  {canRotate ? (
                    <Button variant="secondary" size="sm" onClick={() => setRotating(slot.label)}>
                      Rotate key
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {rotating ? (
        <RotateKeyDialog
          open
          slotName={rotating}
          pending={rotate.pending}
          onOpenChange={(open) => {
            if (!open) setRotating(null);
          }}
          onSubmit={(value) => rotate.rotate(rotating, value, () => setRotating(null))}
        />
      ) : null}

      <ProvidersHonesty />
    </section>
  );
}
