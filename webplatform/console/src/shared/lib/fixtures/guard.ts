/**
 * Data-fixture kill-switch (FS5 T-FS5.1 — the FS4 triple-lock pattern applied
 * to DATA): (a) `server-env.ts` refuses fixture forcing outside local/ci;
 * (b) THIS module throws at import in staging/production, and every fixture
 * module imports it first; (c) `fixture-integrity.test.ts` locks the guard.
 * Real deployments never contain the deterministic dataset.
 */
import { getPublicConfig } from '@/shared/config/env';

const appEnv = getPublicConfig().NEXT_PUBLIC_APP_ENV;
if (appEnv === 'staging' || appEnv === 'production') {
  throw new Error(
    `DATA-FIXTURE INTEGRITY: a fixture module was imported with NEXT_PUBLIC_APP_ENV="${appEnv}". ` +
      'Deterministic data stand-ins must never exist in staging/production builds (FS5 T-FS5.1).',
  );
}

/** E2E scenario switch — set as a cookie by tests, read by the resolver. */
export const FIXTURE_SCENARIO_COOKIE = 'onyx-fixture-scenario';
export type FixtureScenario = 'default' | 'empty';

export function parseScenario(value: string | undefined | null): FixtureScenario {
  return value === 'empty' ? 'empty' : 'default';
}
