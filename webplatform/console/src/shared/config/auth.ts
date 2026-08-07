/**
 * Session cookie contract (FS4 — real cookie-session auth, §F7.1 / SEC-1).
 *
 * The session itself is the BACKEND-issued HttpOnly/Secure/SameSite cookie set
 * by `POST /auth/login`; the frontend never parses or stores its value — it
 * only checks presence (middleware) and forwards it (server session
 * resolution, BFF proxy). The backend cookie NAME is not stated in
 * `API_SPEC.md`, so it is configurable via server env `SESSION_COOKIE_NAME`
 * (*(assumed)* default; confirmed at FE-RV-7).
 *
 * `onyx-role` is an HttpOnly ROLE-HINT cookie maintained by the BFF auth
 * handlers strictly alongside the session. It carries a role name only and
 * exists so middleware can REFLECT per-route RBAC (SEC-2) without decoding the
 * opaque session — it is never a security mechanism; the backend is the
 * boundary (§F3.2).
 */
import { ROLES, type Role } from '@/shared/config/rbac';

/** Backend session cookie name (server env override; middleware-safe). */
export function getSessionCookieName(): string {
  return process.env['SESSION_COOKIE_NAME'] ?? 'session';
}

/** HttpOnly role-hint cookie (UI reflection only — never authorization). */
export const ROLE_HINT_COOKIE = 'onyx-role';

/**
 * Serialized role-hint Set-Cookie values. The BFF appends these as RAW header
 * values alongside the verbatim backend Set-Cookie — mixing
 * `headers.append('set-cookie')` with `response.cookies.set()` is unsafe
 * (NextResponse re-serializes its cookie map and DROPS appended values).
 */
export function roleHintSetCookie(role: Role): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${ROLE_HINT_COOKIE}=${role}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800${secure}`;
}

export function roleHintExpiredCookie(): string {
  return `${ROLE_HINT_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function parseRole(value: string | undefined): Role | null {
  if (!value) return null;
  return (ROLES as readonly string[]).includes(value) ? (value as Role) : null;
}
