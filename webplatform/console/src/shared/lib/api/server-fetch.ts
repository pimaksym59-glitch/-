/**
 * Server-side /api/v1 access for RSC initial data (FS5 T-FS5.1). SERVER-ONLY —
 * never import from client components (it references internal hosts).
 *
 * In local/ci the deterministic fixture dataset answers (same kill-switch
 * family as the auth fixture); everywhere else this is a plain fetch against
 * `INTERNAL_API_BASE_URL` with the caller's cookies forwarded (the session is
 * required by the contract). Wire truth on a live backend is FE-RV-8.
 */
import { getServerConfig, isFixtureAuthEnabled } from '@/shared/config/server-env';
import { AppError, kindFromStatus } from '@/shared/lib/errors';

export interface ServerApiOptions {
  readonly cookieHeader: string;
  /** E2E scenario (fixture env only) — parsed from the scenario cookie. */
  readonly scenario?: 'default' | 'empty';
}

export async function serverApi<T>(path: string, options: ServerApiOptions): Promise<T> {
  if (isFixtureAuthEnabled()) {
    const { resolveFixture } = await import('@/shared/lib/fixtures/dataset');
    const hit = resolveFixture('GET', `/api/v1${path}`, options.scenario ?? 'default');
    if (!hit) {
      throw new AppError({ kind: 'notFound', message: `Fixture has no data for ${path}.` });
    }
    if (hit.status >= 400) {
      throw new AppError({
        kind: kindFromStatus(hit.status),
        status: hit.status,
        message: `Fixture responded ${hit.status} for ${path}.`,
      });
    }
    return hit.body as T;
  }

  const base = getServerConfig().INTERNAL_API_BASE_URL.replace(/\/$/, '');
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      headers: { cookie: options.cookieHeader, accept: 'application/json' },
      cache: 'no-store',
    });
  } catch {
    throw new AppError({ kind: 'network', message: `Upstream unreachable for ${path}.` });
  }
  if (!response.ok) {
    throw new AppError({
      kind: kindFromStatus(response.status),
      status: response.status,
      message: `Upstream ${response.status} for ${path}.`,
    });
  }
  return (await response.json()) as T;
}

/** Convenience: swallow a section-level failure into null (per-card isolation). */
export async function serverApiOrNull<T>(
  path: string,
  options: ServerApiOptions,
): Promise<T | null> {
  try {
    return await serverApi<T>(path, options);
  } catch {
    return null;
  }
}
