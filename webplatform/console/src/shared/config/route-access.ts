/**
 * Route → access decision (Stage 2 §8 SEC-2/SEC-7, Stage 3 §5).
 * Pure and server-safe so `middleware.ts` and tests share one implementation.
 *
 * This is **reflection, not enforcement**: the backend is the security boundary
 * (§F3.2/§F7.2). The UI must simply never crash or leak an unreachable screen.
 */
import { RBAC_MATRIX, type Role } from './rbac';
import { ROUTE_LIST, isPublicPath, type RouteDef } from './routes';

export type AccessDecision =
  | { readonly kind: 'allow' }
  | { readonly kind: 'unauthenticated' }
  | { readonly kind: 'forbidden'; readonly route: RouteDef };

/** Longest-prefix route match for a pathname. */
export function matchRoute(pathname: string): RouteDef | null {
  const matches = ROUTE_LIST.filter(
    (route) =>
      route.path !== '/' && (pathname === route.path || pathname.startsWith(`${route.path}/`)),
  );
  if (matches.length === 0) return null;
  return matches.reduce((best, r) => (r.path.length > best.path.length ? r : best));
}

export function decideAccess(pathname: string, role: Role | null): AccessDecision {
  if (isPublicPath(pathname)) return { kind: 'allow' };
  if (!role) return { kind: 'unauthenticated' };

  const route = matchRoute(pathname);
  if (!route?.permission) return { kind: 'allow' };

  return RBAC_MATRIX[role].includes(route.permission)
    ? { kind: 'allow' }
    : { kind: 'forbidden', route };
}
