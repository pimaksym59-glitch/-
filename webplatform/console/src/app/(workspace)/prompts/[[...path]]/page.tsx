import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { groupPromptsByType, mapPrompt, type PromptWireDTO } from '@/entities/prompt';
import { isFixtureAuthEnabled } from '@/shared/config/server-env';
import { serverApiOrNull, type ServerApiOptions } from '@/shared/lib/api/server-fetch';
import { PromptLibraryView, type PromptsInitial } from '@/widgets/prompts';

export const metadata: Metadata = { title: 'Prompt Library' };

/**
 * Prompt Library (FS10 T-FS10.4 — D3 §10). RSC initial-data page over the
 * frozen `GET /prompts` (a failed fetch arrives as null and its island
 * refetches).
 *
 * **No channel scoping, deliberately.** Every other workspace screen seeds its
 * island with `forChannelId` because its records carry a `channel_id`; the
 * `prompts` table does not (DATABASE_SPEC §prompts), so this is the project's
 * first platform-wide surface (plan §5.2 D1, owner requirement A). This page
 * does not read the channel cookie and does not fetch `/channels` at all.
 *
 * URL grammar (plan §3.5): `/prompts` = the library · `/prompts/<type>` = a
 * prompt type's version chain · `/prompts/<type>/versions/<n>` = one version ·
 * `?q=`, `?type=`, `?compare=`, `?inspect=` are query state.
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

/** `[]` · `[type]` · `[type, 'versions', n]` — anything else is just the type. */
function parsePath(path: readonly string[] | undefined): {
  type: string | null;
  version: number | null;
} {
  const type = path?.[0] ?? null;
  if (path?.[1] === 'versions') {
    const parsed = Number.parseInt(path[2] ?? '', 10);
    return { type, version: Number.isFinite(parsed) ? parsed : null };
  }
  return { type, version: null };
}

export default async function PromptsPage({
  params,
}: {
  readonly params: Promise<{ path?: readonly string[] }>;
}): Promise<React.ReactElement> {
  const [{ path }, store] = await Promise.all([params, cookies()]);
  const options = await buildApiOptions(store);

  const wire = await serverApiOrNull<readonly PromptWireDTO[]>('/prompts', options);
  const initial: PromptsInitial = {
    groups: wire ? groupPromptsByType(wire.map(mapPrompt)) : null,
  };

  const { type, version } = parsePath(path);
  return <PromptLibraryView initial={initial} type={type} version={version} />;
}
