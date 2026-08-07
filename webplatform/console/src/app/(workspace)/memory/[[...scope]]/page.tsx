import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { mapActor, type ActorWireDTO } from '@/entities/actor';
import { mapChannel, type ChannelWireDTO } from '@/entities/channel';
import { mapPersona, sortPersonas, type PersonaWireDTO } from '@/entities/persona';
import { CHANNEL_COOKIE } from '@/shared/config/shell';
import { isFixtureAuthEnabled } from '@/shared/config/server-env';
import { serverApiOrNull, type ServerApiOptions } from '@/shared/lib/api/server-fetch';
import { MemoryView, type MemoryInitial } from '@/widgets/memory';

export const metadata: Metadata = { title: 'Memory' };

/**
 * Memory Explorer (FS8 T-FS8.4 — D3 §8). RSC initial-data page: the
 * channel-scoped persona and actor LISTS are fetched server-side (per-section
 * isolation — a failed fetch arrives as null and its island refetches) and
 * seed the Query islands with `forChannelId` (the FS5 cross-channel lesson).
 * Detail panes, the edit dialog and the AI panel are LAZY client surfaces.
 *
 * URL grammar (plan §3.5): `/memory` = list · `/memory/<personaId>` = the
 * persona deep link · `?q=`, `?scope=`, `?inspect=` are query state.
 */
type CookieStore = Awaited<ReturnType<typeof cookies>>;

async function buildApiOptions(store: CookieStore): Promise<ServerApiOptions> {
  const cookieHeader = store
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');
  if (isFixtureAuthEnabled()) {
    // Fixture modules are kill-switched — reach them only via dynamic import.
    const { FIXTURE_SCENARIO_COOKIE, parseScenario } = await import('@/shared/lib/fixtures/guard');
    return { cookieHeader, scenario: parseScenario(store.get(FIXTURE_SCENARIO_COOKIE)?.value) };
  }
  return { cookieHeader };
}

export default async function MemoryPage({
  params,
}: {
  readonly params: Promise<{ scope?: readonly string[] }>;
}): Promise<React.ReactElement> {
  const [{ scope }, store] = await Promise.all([params, cookies()]);
  const options = await buildApiOptions(store);

  const channelsWire = await serverApiOrNull<readonly ChannelWireDTO[]>('/channels', options);
  const channels = channelsWire ? channelsWire.map(mapChannel) : null;

  const preferredId = store.get(CHANNEL_COOKIE)?.value;
  const active = channels?.find((channel) => channel.id === preferredId) ?? channels?.[0] ?? null;

  let initial: MemoryInitial = {
    channels,
    forChannelId: null,
    personas: null,
    actors: null,
  };

  if (active) {
    const id = encodeURIComponent(active.id);
    const [personasWire, actorsWire] = await Promise.all([
      serverApiOrNull<readonly PersonaWireDTO[]>(`/channels/${id}/personas`, options),
      serverApiOrNull<readonly ActorWireDTO[]>(`/channels/${id}/actors`, options),
    ]);
    initial = {
      channels,
      forChannelId: active.id,
      personas: personasWire ? sortPersonas(personasWire.map(mapPersona)) : null,
      actors: actorsWire ? actorsWire.map(mapActor) : null,
    };
  }

  // `/memory/<personaId>` — the single-segment persona deep link (§3.5).
  return <MemoryView initial={initial} personaId={scope?.[0] ?? null} />;
}
