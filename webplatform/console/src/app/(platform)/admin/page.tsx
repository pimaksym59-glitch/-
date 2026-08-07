import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import {
  mapConfigVersion,
  sortConfigVersions,
  type ConfigVersionWireDTO,
} from '@/entities/config-version';
import { mapPlatformUser, sortUsers, type PlatformUserWireDTO } from '@/entities/platform-user';
import { serverApiOrNull } from '@/shared/lib/api/server-fetch';
import { AdminView, type AdminInitial } from '@/widgets/admin';
import { platformApiOptions } from '../_platform/server';

export const metadata: Metadata = { title: 'Admin' };

/**
 * Admin (FS12 T-FS12.5 — D3 §14). RSC initial-data page over the frozen
 * §Users and §Config-versions calls. Each fetch is independent and a failure
 * arrives as `null`, so one dead endpoint cannot blank the screen — the FS5
 * per-card isolation rule at panel scale.
 *
 * Platform-wide: no channel cookie is read and `/channels` is never fetched.
 */
export default async function AdminPage(): Promise<React.ReactElement> {
  const store = await cookies();
  const options = await platformApiOptions(store);

  const [usersWire, configWire] = await Promise.all([
    serverApiOrNull<readonly PlatformUserWireDTO[]>('/users', options),
    serverApiOrNull<readonly ConfigVersionWireDTO[]>('/config-versions', options),
  ]);

  const initial: AdminInitial = {
    users: usersWire ? sortUsers(usersWire.map(mapPlatformUser)) : null,
    configVersions: configWire ? sortConfigVersions(configWire.map(mapConfigVersion)) : null,
  };

  return <AdminView initial={initial} />;
}
