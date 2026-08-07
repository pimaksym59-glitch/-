/**
 * Fixture AuthGateway + kill-switch guards (FS4 T-FS4.2/T-FS4.3 a+b).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const ENV_KEY = 'NEXT_PUBLIC_APP_ENV';
const originalEnv = process.env[ENV_KEY];

afterEach(() => {
  if (originalEnv === undefined) delete process.env.NEXT_PUBLIC_APP_ENV;
  else process.env[ENV_KEY] = originalEnv;
  vi.resetModules();
});

async function loadFixture() {
  vi.resetModules();
  return import('@/shared/lib/auth-gateway/fixture');
}

describe('fixture gateway (local/ci only)', () => {
  it('logs in every role with the documented demo credential', async () => {
    process.env[ENV_KEY] = 'local';
    const { fixtureGateway, FIXTURE_PASSWORD, fixtureEmail } = await loadFixture();
    for (const role of ['owner', 'admin', 'editor', 'analyst', 'viewer'] as const) {
      const result = await fixtureGateway.login({
        email: fixtureEmail(role),
        password: FIXTURE_PASSWORD,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.session.role).toBe(role);
        expect(result.setCookies[0]).toMatch(/HttpOnly/);
        expect(result.setCookies[0]).toMatch(/SameSite=Lax/);
      }
    }
  });

  it('rejects a wrong password and an unknown email with 401', async () => {
    process.env[ENV_KEY] = 'local';
    const { fixtureGateway, FIXTURE_PASSWORD } = await loadFixture();
    expect(await fixtureGateway.login({ email: 'owner@console.local', password: 'wrong' })).toEqual(
      { ok: false, status: 401 },
    );
    expect(
      await fixtureGateway.login({ email: 'nobody@console.local', password: FIXTURE_PASSWORD }),
    ).toEqual({ ok: false, status: 401 });
  });

  it('me() resolves the session from its cookie and logout() expires it', async () => {
    process.env[ENV_KEY] = 'local';
    const { fixtureGateway } = await loadFixture();
    const session = await fixtureGateway.me('session=fixture-analyst');
    expect(session?.role).toBe('analyst');
    expect(await fixtureGateway.me('session=garbage')).toBeNull();
    const cookies = await fixtureGateway.logout('session=fixture-analyst');
    expect(cookies[0]).toMatch(/Max-Age=0/);
  });
});

describe('kill-switch guards (T-FS4.3)', () => {
  it('(b) the fixture module THROWS when imported in production/staging', async () => {
    for (const env of ['production', 'staging']) {
      process.env[ENV_KEY] = env;
      await expect(loadFixture()).rejects.toThrow(/AUTH INTEGRITY/);
    }
  });

  it('(a) server config REFUSES AUTH_FIXTURE_FORCE outside local/ci', async () => {
    process.env[ENV_KEY] = 'production';
    process.env['AUTH_FIXTURE_FORCE'] = 'true';
    try {
      vi.resetModules();
      const { getServerConfig } = await import('@/shared/config/server-env');
      expect(() => getServerConfig()).toThrow(/AUTH INTEGRITY/);
    } finally {
      delete process.env['AUTH_FIXTURE_FORCE'];
    }
  });
});
