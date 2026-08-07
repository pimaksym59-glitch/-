/**
 * BFF logout handler (FS4). Forwards the session to the contract
 * `POST /auth/logout`, relays the expiring Set-Cookie values and always clears
 * the role hint — even if the upstream is unreachable, the browser side of the
 * session ends.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { roleHintExpiredCookie } from '@/shared/config/auth';
import { getAuthGateway } from '@/shared/lib/auth-gateway';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const gateway = await getAuthGateway();
  const setCookies = await gateway.logout(request.headers.get('cookie') ?? '');

  const response = new NextResponse(null, { status: 204 });
  // ALL cookies via raw appends (see roleHintSetCookie's warning in config/auth).
  for (const cookie of setCookies) response.headers.append('set-cookie', cookie);
  response.headers.append('set-cookie', roleHintExpiredCookie());
  return response;
}
