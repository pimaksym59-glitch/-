/**
 * Fixture AuthGateway — deterministic per-role accounts for local/ci ONLY
 * (E2E + demo without a live backend). Ships ZERO secrets: the shared
 * password below is public test data, printed on the login screen in local.
 *
 * KILL-SWITCH (FS4 T-FS4.3 guard (b)): importing this module in a
 * staging/production build THROWS at module scope. Guard (a) is the server-env
 * refusal (`server-env.ts`); guard (c) is the source-grep integrity test.
 * The selector (`select.ts`) additionally never imports this module outside
 * local/ci — three independent locks.
 */
import { getSessionCookieName } from '@/shared/config/auth';
import { ROLES, type Role } from '@/shared/config/rbac';
import { getPublicConfig } from '@/shared/config/env';
import type { LoginRequestDTO, SessionDTO } from '@/shared/types';
import type { AuthGateway, GatewayLoginResult } from './types';

{
  const appEnv = getPublicConfig().NEXT_PUBLIC_APP_ENV;
  if (appEnv === 'staging' || appEnv === 'production') {
    throw new Error(
      `AUTH INTEGRITY: the fixture auth gateway was imported with NEXT_PUBLIC_APP_ENV="${appEnv}". ` +
        'An auth stand-in must never exist in staging/production builds (FS4 T-FS4.3).',
    );
  }
}

/** Public, documented test credential — NOT a secret. */
export const FIXTURE_PASSWORD = 'console-demo';
export const fixtureEmail = (role: Role): string => `${role}@console.local`;

const DISPLAY: Record<Role, string> = {
  owner: 'Console Owner',
  admin: 'Console Admin',
  editor: 'Console Editor',
  analyst: 'Console Analyst',
  viewer: 'Console Viewer',
};

function sessionFor(role: Role): SessionDTO {
  return {
    userId: `usr_fixture_${role}`,
    email: fixtureEmail(role),
    displayName: DISPLAY[role],
    role,
    mfaEnabled: false,
  };
}

const COOKIE_PREFIX = 'fixture-';

function sessionSetCookie(role: Role): string {
  return `${getSessionCookieName()}=${COOKIE_PREFIX}${role}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800`;
}

function expiredSessionCookie(): string {
  return `${getSessionCookieName()}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function roleFromCookieHeader(cookieHeader: string): Role | null {
  const name = getSessionCookieName();
  const match = new RegExp(`(?:^|;\\s*)${name}=${COOKIE_PREFIX}([a-z]+)`).exec(cookieHeader);
  const candidate = match?.[1];
  return candidate && (ROLES as readonly string[]).includes(candidate) ? (candidate as Role) : null;
}

export const fixtureGateway: AuthGateway = {
  login(request: LoginRequestDTO): Promise<GatewayLoginResult> {
    const role = ROLES.find((r) => fixtureEmail(r) === request.email.toLowerCase().trim());
    if (!role || request.password !== FIXTURE_PASSWORD) {
      return Promise.resolve({ ok: false, status: 401 });
    }
    return Promise.resolve({
      ok: true,
      session: sessionFor(role),
      setCookies: [sessionSetCookie(role)],
    });
  },

  me(cookieHeader: string): Promise<SessionDTO | null> {
    const role = roleFromCookieHeader(cookieHeader);
    return Promise.resolve(role ? sessionFor(role) : null);
  },

  logout(): Promise<readonly string[]> {
    return Promise.resolve([expiredSessionCookie()]);
  },
};
