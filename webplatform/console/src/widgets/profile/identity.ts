/**
 * The profile's identity projection (FS13 T-FS13.8 — D3 §24).
 *
 * **Why this is a widget-level module and not an entity.** `entities/session`
 * is reached through `AuthProvider`, which sits in the frozen seven-provider
 * tree — so that slice is already in EVERY route's First Load. Adding a profile
 * projection to its barrel would put those bytes on all 31 routes, which is the
 * FS12 `entities/job` lesson in its most expensive form. FS9 set the precedent
 * for the alternative: resolve at the widget level and leave the entity alone.
 *
 * There is also nothing to fetch. `GET /auth/me` is already loaded by the
 * provider, so this file is a pure projection with no query, no key and no path
 * — which is why FS13 adds none of the three anywhere.
 */
import type { SessionDTO } from '@/shared/types';

export interface IdentityVM {
  readonly displayName: string;
  readonly email: string;
  readonly role: string;
  readonly userId: string | null;
}

/**
 * `displayName` is whatever `mapAuthMe` produced — which falls back to the
 * email, because the frozen `users` table has **no name column**. The console
 * does not invent one, and the avatar draws its initials from this same value
 * rather than from a name that does not exist.
 */
export function toIdentity(session: SessionDTO | null): IdentityVM | null {
  if (!session) return null;
  return {
    displayName: session.displayName,
    email: session.email,
    role: session.role,
    userId: session.userId === '' ? null : session.userId,
  };
}
