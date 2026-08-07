/**
 * BFF login handler (FS4 T-FS4.2 — Stage 2 §4 "cookie handling"). Proxies the
 * contract `POST /auth/login` via the AuthGateway, forwards the backend
 * Set-Cookie VERBATIM and maintains the HttpOnly role-hint cookie for
 * middleware RBAC reflection. Credentials are never logged or echoed; failure
 * bodies never distinguish "unknown email" from "wrong password" (no user
 * enumeration).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { loginSchema, toLoginRequest } from '@/features/auth';
import { roleHintSetCookie } from '@/shared/config/auth';
import { getAuthGateway } from '@/shared/lib/auth-gateway';

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Malformed request.' }, { status: 400 });
  }
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Malformed request.' }, { status: 400 });
  }

  const gateway = await getAuthGateway();
  const result = await gateway.login(toLoginRequest(parsed.data));

  if (!result.ok) {
    const message =
      result.status === 401
        ? 'Invalid email or password.'
        : result.status === 429
          ? 'Too many attempts. Try again shortly.'
          : 'Sign-in is temporarily unavailable.';
    const response = NextResponse.json({ message }, { status: result.status });
    if (result.status === 429 && result.retryAfterSeconds) {
      response.headers.set('retry-after', String(result.retryAfterSeconds));
    }
    return response;
  }

  const response = NextResponse.json(result.session, { status: 200 });
  // ALL cookies go through raw appends — see roleHintSetCookie's warning.
  for (const cookie of result.setCookies) response.headers.append('set-cookie', cookie);
  response.headers.append('set-cookie', roleHintSetCookie(result.session.role));
  return response;
}
