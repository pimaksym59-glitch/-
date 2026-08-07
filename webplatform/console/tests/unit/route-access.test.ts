import { describe, expect, it } from 'vitest';
import { decideAccess, matchRoute } from '@/shared/config/route-access';
import { ROLES } from '@/shared/config/rbac';

describe('matchRoute', () => {
  it('matches by longest prefix', () => {
    expect(matchRoute('/analytics')?.label).toBe('Analytics');
    expect(matchRoute('/knowledge/doc-123')?.label).toBe('Knowledge');
    expect(matchRoute('/nope')).toBeNull();
  });
});

describe('decideAccess', () => {
  it('always allows public paths, even signed out', () => {
    for (const path of ['/', '/login', '/register', '/docs/getting-started', '/403']) {
      expect(decideAccess(path, null).kind).toBe('allow');
    }
  });

  it('redirects unauthenticated users away from protected paths', () => {
    expect(decideAccess('/dashboard', null).kind).toBe('unauthenticated');
    expect(decideAccess('/admin', null).kind).toBe('unauthenticated');
  });

  it('allows the owner everywhere', () => {
    for (const path of ['/dashboard', '/admin', '/flags', '/billing', '/chat']) {
      expect(decideAccess(path, 'owner').kind).toBe('allow');
    }
  });

  it('forbids platform management for non-privileged roles', () => {
    expect(decideAccess('/admin', 'viewer').kind).toBe('forbidden');
    expect(decideAccess('/admin', 'editor').kind).toBe('forbidden');
    expect(decideAccess('/flags', 'analyst').kind).toBe('forbidden');
  });

  it('forbids content editing for read-only roles but allows analytics', () => {
    expect(decideAccess('/chat', 'viewer').kind).toBe('forbidden');
    expect(decideAccess('/analytics', 'viewer').kind).toBe('allow');
    expect(decideAccess('/analytics', 'analyst').kind).toBe('allow');
  });

  it('never throws for any role/path combination', () => {
    const paths = ['/dashboard', '/chat', '/admin', '/logs', '/settings', '/unknown/deep/path'];
    for (const role of ROLES) {
      for (const path of paths) {
        expect(() => decideAccess(path, role)).not.toThrow();
      }
    }
  });
});
