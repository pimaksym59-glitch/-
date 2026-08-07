/**
 * FS13 T-FS13.11 — the negative locks for the Account surface.
 *
 * D4 §4 marked Settings' API as *"user prefs (assumed)"*. The frozen contract
 * refutes it: there is no preferences resource, no self-service account write,
 * no password or MFA call, no avatar upload, no session inventory and no
 * notification delivery. Those are **verified absences**, and this file is what
 * keeps them verified — a future contributor cannot quietly teach the fixture
 * resolver to answer one of these paths without a test turning red.
 *
 * This is the FS12 negative-lock pattern (a first for that stage) applied to
 * the six absences FS13 states on screen.
 */
import { describe, expect, it } from 'vitest';
import { resolveFixture } from '@/shared/lib/fixtures/dataset';

const call = (method: string, path: string) => resolveFixture(method, `/api/v1${path}`, 'default');

describe('FS13 — paths the contract does not carry answer NOTHING', () => {
  it('has no preferences resource of any kind', () => {
    expect(call('GET', '/preferences')).toBeUndefined();
    expect(call('PUT', '/preferences')).toBeUndefined();
    expect(call('GET', '/users/me/preferences')).toBeUndefined();
    expect(call('GET', '/settings')).toBeUndefined();
    expect(call('PUT', '/settings')).toBeUndefined();
  });

  it('has no self-service account read or write', () => {
    // `GET /users/{id}` does not exist at all (FS12 D7), so there is no route.
    expect(call('GET', '/users/me')).toBeUndefined();
    expect(call('PUT', '/users/me')).toBeUndefined();
    expect(call('POST', '/users/me/avatar')).toBeUndefined();

    // `PATCH /users/{id}` DOES exist — it is the owner-only role change — so a
    // request for `me` reaches it and is honestly refused: `me` is not a user
    // id. What matters is that it can never SUCCEED, i.e. there is no
    // self-service alias hiding inside the governance write.
    const patched = call('PATCH', '/users/me');
    expect(patched?.status).toBe(404);
    expect(patched?.status).not.toBeLessThan(400);
  });

  it('has no password or MFA call', () => {
    expect(call('POST', '/auth/password')).toBeUndefined();
    expect(call('PUT', '/auth/password')).toBeUndefined();
    expect(call('POST', '/auth/password/reset')).toBeUndefined();
    expect(call('POST', '/auth/mfa')).toBeUndefined();
    expect(call('POST', '/auth/mfa/enroll')).toBeUndefined();
    expect(call('DELETE', '/auth/mfa')).toBeUndefined();
  });

  it('has no session inventory and no sign-in history', () => {
    expect(call('GET', '/auth/sessions')).toBeUndefined();
    expect(call('GET', '/sessions')).toBeUndefined();
    expect(call('GET', '/auth/logins')).toBeUndefined();
    expect(call('GET', '/login-history')).toBeUndefined();
  });

  it('has no notification delivery or per-kind preference resource', () => {
    expect(call('GET', '/notifications')).toBeUndefined();
    expect(call('GET', '/notifications/preferences')).toBeUndefined();
    expect(call('PUT', '/notifications/preferences')).toBeUndefined();
  });

  it('has no account export and no SSO enrolment', () => {
    expect(call('GET', '/users/me/export')).toBeUndefined();
    expect(call('POST', '/auth/sso')).toBeUndefined();
  });
});

describe('FS13 — the ONE call the account surface really makes', () => {
  it('serves this user’s own audit records when the actor is their id', () => {
    const hit = call('GET', '/audit-log?actor=usr_fixture_owner');
    expect(hit?.status).toBe(200);
    const rows = hit?.body as readonly { actor_user_id: string }[];
    expect(rows.length).toBeGreaterThan(0);
    // Every returned row belongs to that actor — the filter is real, not decorative.
    expect(rows.every((row) => row.actor_user_id === 'usr_fixture_owner')).toBe(true);
  });

  it('returns an empty list for a permitted user with no recorded actions', () => {
    const hit = call('GET', '/audit-log?actor=usr_fixture_admin');
    expect(hit?.status).toBe(200);
    expect(hit?.body).toEqual([]);
  });

  it('leaves the FS12 platform-wide rows reachable and unchanged', () => {
    const rows = call('GET', '/audit-log')?.body as readonly { id: string }[];
    const ids = rows.map((row) => row.id);
    // FS12's five rows are byte-identical; FS13 only ADDED rows (new ids).
    for (const id of ['aud_1', 'aud_2', 'aud_3', 'aud_4', 'aud_5']) {
      expect(ids).toContain(id);
    }
    expect(ids).toContain('aud_self_1');
  });
});
