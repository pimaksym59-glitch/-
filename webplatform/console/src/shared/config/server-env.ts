/**
 * Server-only runtime config (FS4). Never imported by client components —
 * values may reference internal hosts. Zod-validated, fail-fast.
 *
 * AUTH INTEGRITY (plan T-FS4.3 guard (a)): a staging/production environment
 * combined with `AUTH_FIXTURE_FORCE=true` REFUSES to configure — the process
 * cannot build/boot with an auth stand-in outside local/ci. Guards (b) and
 * (c) live in `shared/lib/auth-gateway/fixture.ts` (module-scope throw) and
 * `tests/unit/auth-integrity.test.ts` (source-tree grep).
 */
import { z } from 'zod';
import { getPublicConfig } from './env';

const serverEnvSchema = z.object({
  /** Backend session cookie name — *(assumed)* default, FE-RV-7 confirms. */
  SESSION_COOKIE_NAME: z.string().min(1).default('session'),
  /** Absolute base for server-side calls to the frozen /api/v1 contract. */
  INTERNAL_API_BASE_URL: z.string().url().default('http://127.0.0.1:8000/api/v1'),
  /** Test-only escape hatch; ILLEGAL outside local/ci (see refine below). */
  AUTH_FIXTURE_FORCE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

export type ServerConfig = z.infer<typeof serverEnvSchema>;

let cached: ServerConfig | null = null;

export function getServerConfig(): ServerConfig {
  if (cached) return cached;
  const parsed = serverEnvSchema.safeParse({
    SESSION_COOKIE_NAME: process.env['SESSION_COOKIE_NAME'],
    INTERNAL_API_BASE_URL: process.env['INTERNAL_API_BASE_URL'],
    AUTH_FIXTURE_FORCE: process.env['AUTH_FIXTURE_FORCE'],
  });
  if (!parsed.success) {
    throw new Error(`Invalid server environment config:\n${parsed.error.toString()}`);
  }
  const appEnv = getPublicConfig().NEXT_PUBLIC_APP_ENV;
  if ((appEnv === 'staging' || appEnv === 'production') && parsed.data.AUTH_FIXTURE_FORCE) {
    throw new Error(
      'AUTH INTEGRITY: AUTH_FIXTURE_FORCE is illegal when NEXT_PUBLIC_APP_ENV is ' +
        `"${appEnv}" — an auth stand-in must never ship (FS4 T-FS4.3).`,
    );
  }
  cached = parsed.data;
  return cached;
}

/** True when the deterministic fixture auth gateway is the legal choice. */
export function isFixtureAuthEnabled(): boolean {
  const appEnv = getPublicConfig().NEXT_PUBLIC_APP_ENV;
  const { AUTH_FIXTURE_FORCE } = getServerConfig();
  return appEnv === 'local' || appEnv === 'ci' || AUTH_FIXTURE_FORCE;
}
