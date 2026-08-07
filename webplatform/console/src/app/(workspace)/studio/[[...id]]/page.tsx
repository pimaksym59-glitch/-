import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { mapChannel, type ChannelWireDTO } from '@/entities/channel';
import { mapImage, sortImages, type ImageWireDTO } from '@/entities/image';
import { CHANNEL_COOKIE } from '@/shared/config/shell';
import { isFixtureAuthEnabled } from '@/shared/config/server-env';
import { serverApiOrNull, type ServerApiOptions } from '@/shared/lib/api/server-fetch';
import { StudioView, type StudioInitial } from '@/widgets/studio';

export const metadata: Metadata = { title: 'Image Studio' };

/**
 * Image Studio (FS9 T-FS9.4 — D3 §9). RSC initial-data page: the
 * channel-scoped image LIST is fetched server-side (a failed fetch arrives as
 * null and its island refetches) and seeds the Query island with
 * `forChannelId` (the FS5 cross-channel lesson). Every detail pane, the
 * references panel, the upload dialog and the AI panel are LAZY client
 * surfaces (plan §3.1).
 *
 * URL grammar (plan §3.5): `/studio` = grid · `/studio/<imageId>` = the record
 * deep link · `?q=`, `?panel=`, `?inspect=` are query state.
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

export default async function StudioPage({
  params,
}: {
  readonly params: Promise<{ id?: readonly string[] }>;
}): Promise<React.ReactElement> {
  const [{ id }, store] = await Promise.all([params, cookies()]);
  const options = await buildApiOptions(store);

  const channelsWire = await serverApiOrNull<readonly ChannelWireDTO[]>('/channels', options);
  const channels = channelsWire ? channelsWire.map(mapChannel) : null;

  const preferredId = store.get(CHANNEL_COOKIE)?.value;
  const active = channels?.find((channel) => channel.id === preferredId) ?? channels?.[0] ?? null;

  let initial: StudioInitial = { channels, forChannelId: null, images: null };

  if (active) {
    const imagesWire = await serverApiOrNull<readonly ImageWireDTO[]>(
      `/channels/${encodeURIComponent(active.id)}/images`,
      options,
    );
    initial = {
      channels,
      forChannelId: active.id,
      images: imagesWire ? sortImages(imagesWire.map(mapImage)) : null,
    };
  }

  // `/studio/<imageId>` — the single-segment record deep link (§3.5).
  return <StudioView initial={initial} imageId={id?.[0] ?? null} />;
}
