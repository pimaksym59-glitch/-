/**
 * Route-protection middleware (Stage 2 §8 SEC-2 / Stage 3 §5 · FS4).
 *
 * Real-session semantics:
 *  - authenticated  = the BACKEND session cookie is PRESENT (its value stays
 *    opaque — never parsed here);
 *  - the role comes from the HttpOnly `onyx-role` HINT maintained by the BFF
 *    auth handlers (UI reflection only — the backend is the boundary, §F3.2);
 *  - session present but hint missing → pass through as
 *    authenticated-unknown-role: the server layout resolves the truth via
 *    /auth/me (`requireSession`), so no false 403 is ever produced here.
 *
 * The decision logic (`decideAccess`) is pure and UNCHANGED since FS2.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { ROLE_HINT_COOKIE, getSessionCookieName, parseRole } from '@/shared/config/auth';
import { decideAccess } from '@/shared/config/route-access';

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const sessionPresent = request.cookies.has(getSessionCookieName());
  const roleHint = parseRole(request.cookies.get(ROLE_HINT_COOKIE)?.value);

  if (!sessionPresent) {
    const decision = decideAccess(pathname, null);
    if (decision.kind === 'unauthenticated') {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.search = '';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (!roleHint) {
    // Authenticated-unknown-role: defer to the server layout's /auth/me check.
    return NextResponse.next();
  }

  const decision = decideAccess(pathname, roleHint);
  if (decision.kind === 'forbidden') {
    const url = request.nextUrl.clone();
    url.pathname = '/403';
    url.search = `?from=${encodeURIComponent(pathname)}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except API routes, Next internals and static files.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
