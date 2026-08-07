import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { mapChannel, type ChannelWireDTO } from '@/entities/channel';
import { mapDocument, type DocumentWireDTO } from '@/entities/document';
import { CHANNEL_COOKIE } from '@/shared/config/shell';
import { isFixtureAuthEnabled } from '@/shared/config/server-env';
import { serverApiOrNull, type ServerApiOptions } from '@/shared/lib/api/server-fetch';
import { KnowledgeView, type KnowledgeInitial } from '@/widgets/knowledge';

export const metadata: Metadata = { title: 'Knowledge' };

/**
 * Knowledge (FS7 T-FS7.3 — D3 §7). RSC initial-data page: the channel-scoped
 * document LIST is fetched server-side (per-section isolation — a failed fetch
 * arrives as null and the client island refetches) and seeds the Query island
 * with `forChannelId` (the FS5 cross-channel lesson). The reader/detail is a
 * LAZY client surface and fetches client-side. Active channel mirrors the
 * client rule: `onyx-channel` cookie ?? first channel.
 */
type CookieStore = Awaited<ReturnType<typeof cookies>>;

async function buildApiOptions(store: CookieStore): Promise<ServerApiOptions> {
  const cookieHeader = store
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');
  if (isFixtureAuthEnabled()) {
    // Fixture modules are kill-switched (module-scope throw outside local/ci) —
    // reach them only via dynamic import, the server-fetch precedent.
    const { FIXTURE_SCENARIO_COOKIE, parseScenario } = await import('@/shared/lib/fixtures/guard');
    return { cookieHeader, scenario: parseScenario(store.get(FIXTURE_SCENARIO_COOKIE)?.value) };
  }
  return { cookieHeader };
}

export default async function KnowledgePage({
  params,
}: {
  readonly params: Promise<{ docId?: readonly string[] }>;
}): Promise<React.ReactElement> {
  const [{ docId }, store] = await Promise.all([params, cookies()]);
  const options = await buildApiOptions(store);

  const channelsWire = await serverApiOrNull<readonly ChannelWireDTO[]>('/channels', options);
  const channels = channelsWire ? channelsWire.map(mapChannel) : null;

  const preferredId = store.get(CHANNEL_COOKIE)?.value;
  const active = channels?.find((channel) => channel.id === preferredId) ?? channels?.[0] ?? null;

  let initial: KnowledgeInitial = { channels, forChannelId: null, documents: null };
  if (active) {
    const documentsWire = await serverApiOrNull<readonly DocumentWireDTO[]>(
      `/documents?channel_id=${encodeURIComponent(active.id)}`,
      options,
    );
    initial = {
      channels,
      forChannelId: active.id,
      documents: documentsWire ? documentsWire.map(mapDocument) : null,
    };
  }

  return <KnowledgeView initial={initial} docId={docId?.[0] ?? null} />;
}
