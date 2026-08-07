import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import {
  mapAnalytics,
  mapCost,
  type AnalyticsSnapshotWireDTO,
  type CostEntryWireDTO,
} from '@/entities/analytics';
import { mapChannel, type ChannelWireDTO } from '@/entities/channel';
import { mapJob, type TaskWireDTO } from '@/entities/job';
import { mapPost, type PostWireDTO } from '@/entities/post';
import { CHANNEL_COOKIE } from '@/shared/config/shell';
import { isFixtureAuthEnabled } from '@/shared/config/server-env';
import { serverApiOrNull, type ServerApiOptions } from '@/shared/lib/api/server-fetch';
import { DashboardView, type DashboardInitial } from '@/widgets/dashboard';

export const metadata: Metadata = { title: 'Dashboard' };

/**
 * Dashboard (FS5 T-FS5.8 — D3 §4). RSC initial-data page: every section is
 * fetched server-side via `serverApiOrNull` (a failed section arrives as null
 * and its client island refetches/isolates — one failing metric never breaks
 * the page), mapped through the entity mappers and handed to the client
 * islands as Query `initialData`. The active channel mirrors the client rule:
 * `onyx-channel` cookie ?? first channel.
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

export default async function DashboardPage(): Promise<React.ReactElement> {
  const store = await cookies();
  const options = await buildApiOptions(store);

  const channelsWire = await serverApiOrNull<readonly ChannelWireDTO[]>('/channels', options);
  const channels = channelsWire ? channelsWire.map(mapChannel) : null;

  const preferredId = store.get(CHANNEL_COOKIE)?.value;
  const active = channels?.find((channel) => channel.id === preferredId) ?? channels?.[0] ?? null;

  let initial: DashboardInitial = {
    channels,
    forChannelId: null,
    analytics: null,
    costs: null,
    jobs: null,
    needsReview: null,
  };

  if (active) {
    const id = encodeURIComponent(active.id);
    const [analyticsWire, costWire, tasksWire, reviewWire] = await Promise.all([
      serverApiOrNull<AnalyticsSnapshotWireDTO>(`/analytics/channels/${id}`, options),
      serverApiOrNull<readonly CostEntryWireDTO[]>('/cost?group_by=day', options),
      serverApiOrNull<readonly TaskWireDTO[]>(`/tasks?channel_id=${id}`, options),
      serverApiOrNull<readonly PostWireDTO[]>(`/channels/${id}/posts?status=needs_review`, options),
    ]);
    initial = {
      channels,
      forChannelId: active.id,
      analytics: analyticsWire ? mapAnalytics(analyticsWire) : null,
      costs: costWire ? mapCost(costWire) : null,
      jobs: tasksWire ? tasksWire.map(mapJob) : null,
      needsReview: reviewWire ? reviewWire.map(mapPost) : null,
    };
  }

  return <DashboardView initial={initial} />;
}
