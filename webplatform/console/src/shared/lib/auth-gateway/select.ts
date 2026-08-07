/**
 * Gateway selection (FS4 T-FS4.2) — SERVER-SIDE ONLY (BFF route handlers +
 * server layouts; never imported from client components — the gateway would
 * leak internal hosts). The REAL proxy is the default; the fixture
 * is lazily imported ONLY when local/ci — outside those environments the
 * fixture module is never even loaded (and would throw if it were).
 * `resolveServerSession` is the per-request-deduped session resolver used by
 * the root layout and every protected group layout (SEC-2 server re-check).
 */
import { cache } from 'react';
import { isFixtureAuthEnabled } from '@/shared/config/server-env';
import type { SessionDTO } from '@/shared/types';
import type { AuthGateway } from './types';

export async function getAuthGateway(): Promise<AuthGateway> {
  if (isFixtureAuthEnabled()) {
    const { fixtureGateway } = await import('./fixture');
    return fixtureGateway;
  }
  const { realGateway } = await import('./real');
  return realGateway;
}

/** Resolve the session for a raw Cookie header (deduped per RSC render). */
export const resolveServerSession = cache(
  async (cookieHeader: string): Promise<SessionDTO | null> => {
    if (!cookieHeader) return null;
    const gateway = await getAuthGateway();
    return gateway.me(cookieHeader);
  },
);
