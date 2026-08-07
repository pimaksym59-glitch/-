import { describe, expect, it } from 'vitest';
import { loginSchema, safeNextPath, toLoginRequest } from '@/features/auth';
import { mapAuthMe } from '@/shared/lib/auth-gateway';

describe('login schema (contract mirror — email/password/otp?)', () => {
  it('accepts credentials with and without an OTP', () => {
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'x', otp: '123456' }).success).toBe(
      true,
    );
    const noOtp = loginSchema.safeParse({ email: 'a@b.co', password: 'x', otp: '' });
    expect(noOtp.success).toBe(true);
    if (noOtp.success) {
      // Empty OTP is normalized away — the request stays contract-exact.
      expect(toLoginRequest(noOtp.data)).toEqual({ email: 'a@b.co', password: 'x' });
    }
  });

  it('rejects a malformed email and an empty password', () => {
    expect(loginSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'a@b.co', password: '' }).success).toBe(false);
  });
});

describe('safeNextPath (open-redirect guard)', () => {
  it('keeps same-origin paths and rejects everything else', () => {
    expect(safeNextPath('/knowledge/doc-1')).toBe('/knowledge/doc-1');
    expect(safeNextPath(null)).toBe('/dashboard');
    expect(safeNextPath('https://evil.example')).toBe('/dashboard');
    expect(safeNextPath('//evil.example')).toBe('/dashboard');
    expect(safeNextPath('/\\evil.example')).toBe('/dashboard');
  });
});

describe('mapAuthMe (wire → SessionDTO)', () => {
  it('maps the {user, role} wire shape with safe fallbacks', () => {
    expect(mapAuthMe({ user: { id: 'u1', email: 'a@b.co' }, role: 'editor' })).toEqual({
      userId: 'u1',
      email: 'a@b.co',
      displayName: 'a@b.co',
      role: 'editor',
      mfaEnabled: false,
    });
  });

  it('returns null for an unknown role (never invents permissions)', () => {
    expect(mapAuthMe({ user: { id: 'u1', email: 'a@b.co' }, role: 'superuser' })).toBeNull();
  });
});
