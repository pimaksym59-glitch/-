/**
 * Shared RSC helpers for the Platform group (FS12). SERVER-ONLY.
 *
 * Every platform page needs the same two things — the caller's cookies and, in
 * the fixture environment, the scenario — so the builder lives here instead of
 * being copy-pasted nine times. It is the same shape the workspace pages use
 * (the FS5 precedent), minus the channel: **no platform page reads the channel
 * cookie and none fetches `/channels`**, because none of these records carries
 * a `channel_id` (the FS10 requirement-A standard applied to seven surfaces at
 * once). `/jobs` is the single exception the contract itself defines — it
 * accepts an optional `?channel_id=` FILTER, which lives in the URL, not in the
 * workspace's active-channel state.
 */
import type { cookies } from 'next/headers';
import { isFixtureAuthEnabled } from '@/shared/config/server-env';
import type { ServerApiOptions } from '@/shared/lib/api/server-fetch';

type CookieStore = Awaited<ReturnType<typeof cookies>>;

export async function platformApiOptions(store: CookieStore): Promise<ServerApiOptions> {
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
