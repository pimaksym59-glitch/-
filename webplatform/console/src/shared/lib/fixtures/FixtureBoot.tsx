'use client';

/**
 * FixtureBoot (FS5 T-FS5.1) — a TECHNICAL ADAPTER (NuqsAdapter precedent, FS2
 * §5.3): starts the browser fixture worker in local/ci and owns no state, so
 * the frozen seven-provider tree is untouched. In staging/production the env
 * flag is false at build time, the lazy import never happens, and guard.ts
 * would throw even if it did. Children render immediately — first paint is
 * served by RSC initial data.
 *
 * FS7 fix: the worker boot ARMS the transport gate SYNCHRONOUSLY on the first
 * client render (a `useEffect` runs bottom-up, i.e. AFTER child queries have
 * already fired — the latent FS5 race: on a hard navigation the first
 * `/api/v1` fetch could beat the worker, 404, and stick as a 4xx-no-retry
 * error). `apiFetch` awaits the gate, so the first byte leaves only once the
 * worker controls the page. Outside the fixture env the gate stays resolved
 * and nothing changes.
 */
import { useState } from 'react';
import { getPublicConfig } from '@/shared/config/env';
import { setTransportGate } from '@/shared/lib/api/boot-gate';

/** Once per page session — StrictMode double-renders and remounts are safe. */
let workerBoot: Promise<void> | null = null;

function ensureWorkerStarted(): Promise<void> {
  workerBoot ??= import('./browser')
    .then(({ startFixtureWorker }) => startFixtureWorker())
    .catch(() => {
      // A failed boot must never dead-lock the app — the gate opens and
      // requests fall through to the network (honest failure surfaces).
    });
  return workerBoot;
}

export function FixtureBoot({ children }: { children: React.ReactNode }): React.ReactElement {
  const appEnv = getPublicConfig().NEXT_PUBLIC_APP_ENV;
  const enabled = appEnv === 'local' || appEnv === 'ci';

  // Lazy state init = runs once per mount DURING render, before any child
  // effect can fire a query — the gate is armed before the first fetch.
  useState(() => {
    if (enabled && typeof window !== 'undefined') {
      setTransportGate(ensureWorkerStarted());
    }
    return null;
  });

  return <>{children}</>;
}
