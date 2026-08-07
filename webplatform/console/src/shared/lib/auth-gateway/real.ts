/**
 * Real AuthGateway (FS4 default path). Thin proxy over the frozen contract:
 *  - POST /auth/login  → 200 {user} + Set-Cookie | 401   (API_SPEC §Auth)
 *  - GET  /auth/me     → 200 {user, role}
 *  - POST /auth/logout → 204
 * The Set-Cookie values are forwarded VERBATIM — the session stays opaque.
 * `login` chains an immediate `/auth/me` with the fresh cookies to learn the
 * role (login itself returns only `{user}`). Runtime behaviour on the wire is
 * FE-RV-7 — nothing here is claimed live-verified.
 */
import { getServerConfig } from '@/shared/config/server-env';
import type { LoginRequestDTO, AuthMeWireDTO, SessionDTO } from '@/shared/types';
import { mapAuthMe } from './map';
import type { AuthGateway, GatewayLoginResult } from './types';

function base(): string {
  return getServerConfig().INTERNAL_API_BASE_URL.replace(/\/$/, '');
}

/** Build a Cookie header out of freshly issued Set-Cookie values. */
function cookieHeaderFrom(setCookies: readonly string[]): string {
  return setCookies
    .map((c) => c.split(';', 1)[0] ?? '')
    .filter(Boolean)
    .join('; ');
}

async function fetchMe(cookieHeader: string): Promise<SessionDTO | null> {
  const res = await fetch(`${base()}/auth/me`, {
    headers: { cookie: cookieHeader },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return mapAuthMe((await res.json()) as AuthMeWireDTO);
}

export const realGateway: AuthGateway = {
  async login(request: LoginRequestDTO): Promise<GatewayLoginResult> {
    let res: Response;
    try {
      res = await fetch(`${base()}/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(request),
        cache: 'no-store',
      });
    } catch {
      return { ok: false, status: 502 };
    }
    if (res.status === 401) return { ok: false, status: 401 };
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get('retry-after') ?? '0');
      return {
        ok: false,
        status: 429,
        ...(Number.isFinite(retryAfter) && retryAfter > 0 ? { retryAfterSeconds: retryAfter } : {}),
      };
    }
    if (!res.ok) return { ok: false, status: 502 };

    const setCookies = res.headers.getSetCookie();
    const session = await fetchMe(cookieHeaderFrom(setCookies));
    if (!session) return { ok: false, status: 502 };
    return { ok: true, session, setCookies };
  },

  me: fetchMe,

  async logout(cookieHeader: string): Promise<readonly string[]> {
    try {
      const res = await fetch(`${base()}/auth/logout`, {
        method: 'POST',
        headers: { cookie: cookieHeader },
        cache: 'no-store',
      });
      return res.headers.getSetCookie();
    } catch {
      // Upstream unreachable — the BFF still clears its own cookies.
      return [];
    }
  },
};
