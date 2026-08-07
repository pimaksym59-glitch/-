import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { mapReadiness, probePaths, type HealthProbeWireDTO } from '@/entities/probe';
import { serverApiOrNull } from '@/shared/lib/api/server-fetch';
import { HealthView, type HealthInitial } from '@/widgets/health';
import { platformApiOptions } from '../_platform/server';

export const metadata: Metadata = { title: 'Health' };

/**
 * Health (FS12 T-FS12.10 — D3 §16). RSC initial-data page over
 * `GET /health/ready` (§R12.10). A failed fetch arrives as `null` and the view
 * says the probe was unreachable — which is not the same as unhealthy, and the
 * screen keeps that distinction.
 */
export default async function HealthPage(): Promise<React.ReactElement> {
  const store = await cookies();
  const options = await platformApiOptions(store);

  const wire = await serverApiOrNull<HealthProbeWireDTO>(probePaths.ready(), options);
  const initial: HealthInitial = { readiness: wire ? mapReadiness(wire) : null };

  return <HealthView initial={initial} />;
}
