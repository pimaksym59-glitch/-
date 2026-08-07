import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import {
  apiKeyPaths,
  mapApiKeySlot,
  sortApiKeySlots,
  type ApiKeySlotWireDTO,
} from '@/entities/api-key';
import { mapReadiness, probePaths, type HealthProbeWireDTO } from '@/entities/probe';
import { serverApiOrNull } from '@/shared/lib/api/server-fetch';
import { ProvidersView, type ProvidersInitial } from '@/widgets/providers';
import { platformApiOptions } from '../_platform/server';

export const metadata: Metadata = { title: 'Providers' };

/**
 * Providers (FS12 T-FS12.11 — D3 §15). There is no `/providers` endpoint in the
 * frozen contract (plan §5.2 D2), so this page seeds the two calls that do
 * exist: the write-only key slot inventory and the readiness probe. Neither
 * response can carry a secret — `GET /api-keys` never returns values, and the
 * slot VM has no field able to hold one.
 */
export default async function ProvidersPage(): Promise<React.ReactElement> {
  const store = await cookies();
  const options = await platformApiOptions(store);

  const [slotsWire, readyWire] = await Promise.all([
    serverApiOrNull<readonly ApiKeySlotWireDTO[]>(apiKeyPaths.list(), options),
    serverApiOrNull<HealthProbeWireDTO>(probePaths.ready(), options),
  ]);

  const initial: ProvidersInitial = {
    slots: slotsWire ? sortApiKeySlots(slotsWire.map(mapApiKeySlot)) : null,
    readiness: readyWire ? mapReadiness(readyWire) : null,
  };

  return <ProvidersView initial={initial} />;
}
