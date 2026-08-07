/**
 * BFF session-read relay (FS4). The client-side `useSessionQuery`
 * (entities/session) refreshes through this handler so local/ci work through
 * the same gateway seam as real deployments; in real mode this is a thin relay
 * of the contract `GET /auth/me`. Returns the SessionDTO or 401 — never a
 * token.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getAuthGateway } from '@/shared/lib/auth-gateway';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const gateway = await getAuthGateway();
  const session = await gateway.me(request.headers.get('cookie') ?? '');
  if (!session) return NextResponse.json({ message: 'Unauthenticated.' }, { status: 401 });
  return NextResponse.json(session, { status: 200 });
}
