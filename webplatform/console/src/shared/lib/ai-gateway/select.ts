/**
 * AiGateway selection (FS6 T-FS6.1) — SERVER-SIDE ONLY (the BFF relay route;
 * never imported from client components). The REAL verbatim relay is the
 * default; the fixture is lazily imported ONLY in local/ci — outside those
 * environments the fixture module is never even loaded (and would throw if it
 * were). Same selector discipline as the FS4 auth gateway.
 */
import { isFixtureAuthEnabled } from '@/shared/config/server-env';
import type { AiGateway } from './types';

export async function getAiGateway(): Promise<AiGateway> {
  if (isFixtureAuthEnabled()) {
    const { fixtureAiGateway } = await import('./fixture');
    return fixtureAiGateway;
  }
  const { realAiGateway } = await import('./real');
  return realAiGateway;
}
