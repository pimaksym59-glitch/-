/**
 * Middleware real-session semantics (FS4 T-FS4.6). `decideAccess` itself is
 * covered by the untouched FS2 suite; these tests pin the NEW cookie
 * interpretation: presence = authenticated, role from the hint, unknown-role
 * passes through to the server check.
 */
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { middleware } from '@/middleware';

function request(path: string, cookie?: string): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    ...(cookie ? { headers: { cookie } } : {}),
  });
}

describe('middleware (FS4 real-session)', () => {
  it('no session cookie on a protected route → redirect to /login?next=', () => {
    const res = middleware(request('/dashboard'));
    const location = res.headers.get('location');
    expect(location).toContain('/login');
    expect(location).toContain('next=%2Fdashboard');
  });

  it('session present but no role hint → passes through (server resolves)', () => {
    const res = middleware(request('/admin', 'session=opaque-value'));
    expect(res.headers.get('location')).toBeNull();
    expect(res.headers.get('x-middleware-rewrite')).toBeNull();
  });

  it('session + viewer hint on /admin → rewrite to the 403 permission state', () => {
    const res = middleware(request('/admin', 'session=opaque-value; onyx-role=viewer'));
    expect(res.headers.get('x-middleware-rewrite')).toContain('/403');
  });

  it('session + owner hint on /admin → allowed', () => {
    const res = middleware(request('/admin', 'session=opaque-value; onyx-role=owner'));
    expect(res.headers.get('location')).toBeNull();
    expect(res.headers.get('x-middleware-rewrite')).toBeNull();
  });

  it('the session value itself is never interpreted as a role', () => {
    // An attacker-chosen session value must not grant a role reflection.
    const res = middleware(request('/admin', 'session=owner'));
    expect(res.headers.get('x-middleware-rewrite')).toBeNull();
    expect(res.headers.get('location')).toBeNull(); // unknown role → server decides
  });
});
