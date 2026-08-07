import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import {
  analyticsPaths,
  describeFilters,
  mapCostSeries,
  mapSnapshotEntries,
  type DateRange,
} from '@/entities/analytics-report';
import { mapChannel, type ChannelWireDTO } from '@/entities/channel';
import type { AnalyticsSnapshotWireDTO, CostEntryWireDTO } from '@/shared/types';
import { isFixtureAuthEnabled } from '@/shared/config/server-env';
import { CHANNEL_COOKIE } from '@/shared/config/shell';
import { serverApiOrNull, type ServerApiOptions } from '@/shared/lib/api/server-fetch';
import { AnalyticsView, type AnalyticsInitial } from '@/widgets/analytics';

export const metadata: Metadata = { title: 'Analytics' };

/**
 * Analytics (FS11 T-FS11.4 — D3 §12). RSC initial-data page over the frozen
 * §Analytics & Cost group: the channel snapshot and the cost-by-day series are
 * fetched server-side (a failed section arrives as null and its island
 * refetches — per-panel isolation, the FS5 rule), while quality, trends and the
 * period report are client queries because they sit below the fold and change
 * with their own facet controls.
 *
 * The seed carries BOTH the channel and the range it was fetched for: analytics
 * data is channel-scoped AND range-scoped, so seeding another channel's or
 * another range's key would paint the wrong numbers until staleTime expired
 * (the FS5 cross-channel defect, extended by one dimension).
 *
 * `today` is resolved here, once, and handed down so the range maths in
 * `features/filter-analytics` stays a pure function of its inputs.
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

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The URL owns the range; the server honours it when it is well-formed. */
function readRange(params: Record<string, string | string[] | undefined>): DateRange {
  const from = typeof params['from'] === 'string' ? params['from'] : null;
  const to = typeof params['to'] === 'string' ? params['to'] : null;
  return {
    from: from !== null && ISO_DATE.test(from) ? from : null,
    to: to !== null && ISO_DATE.test(to) ? to : null,
  };
}

export default async function AnalyticsPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.ReactElement> {
  const [params, store] = await Promise.all([searchParams, cookies()]);
  const options = await buildApiOptions(store);
  const range = readRange(params);
  const today = new Date().toISOString().slice(0, 10);

  const channelsWire = await serverApiOrNull<readonly ChannelWireDTO[]>('/channels', options);
  const channels = channelsWire ? channelsWire.map(mapChannel) : null;

  const preferredId = store.get(CHANNEL_COOKIE)?.value;
  const active = channels?.find((channel) => channel.id === preferredId) ?? channels?.[0] ?? null;

  let initial: AnalyticsInitial = {
    channels,
    forChannelId: null,
    forRange: null,
    snapshot: null,
    cost: null,
  };

  if (active) {
    const snapshotPath = analyticsPaths.snapshot(active.id, range);
    const costPath = analyticsPaths.cost('day', range);
    const [snapshotWire, costWire] = await Promise.all([
      serverApiOrNull<AnalyticsSnapshotWireDTO>(snapshotPath, options),
      serverApiOrNull<readonly CostEntryWireDTO[]>(costPath, options),
    ]);
    // The server's own receipt time is the honest provenance for a seeded
    // panel; the client refreshes it on the first revalidation.
    const fetchedAt = new Date().toISOString();
    initial = {
      channels,
      forChannelId: active.id,
      forRange: range,
      snapshot: snapshotWire
        ? {
            metrics: mapSnapshotEntries(snapshotWire),
            series: [],
            provenance: {
              endpoint: snapshotPath,
              filters: describeFilters(range, [`channel ${active.id}`]),
              fetchedAt,
              algorithmVersion: null,
              computedAt: null,
            },
          }
        : null,
      cost: costWire
        ? mapCostSeries(costWire, 'day', {
            endpoint: costPath,
            filters: describeFilters(range, ['grouped by day']),
            fetchedAt,
          })
        : null,
    };
  }

  return <AnalyticsView initial={initial} today={today} />;
}
