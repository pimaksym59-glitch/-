/**
 * Server-side session resolution for layouts (FS4 T-FS4.4 — SEC-2's "server
 * layouts re-check"). Middleware redirects are UX; THIS is the render-time
 * guard, and the backend remains the real boundary (§F3.2). Resolution is
 * deduped per render via React cache (see auth-gateway/select).
 */
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { resolveServerSession } from '@/shared/lib/auth-gateway';
import type { SessionDTO } from '@/shared/types';

export async function getServerSession(): Promise<SessionDTO | null> {
  const store = await cookies();
  const header = store
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');
  return resolveServerSession(header);
}

/** Protected group layouts call this — unauthenticated renders never happen. */
export async function requireSession(): Promise<SessionDTO> {
  const session = await getServerSession();
  if (!session) redirect('/login');
  return session;
}
