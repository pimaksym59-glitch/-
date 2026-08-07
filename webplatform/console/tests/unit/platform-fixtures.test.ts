/**
 * FS12 T-FS12.3 — the six real groups AND the negative locks.
 *
 * The positive half is ordinary: the fixture answers exactly the calls the
 * contract carries. The negative half is the one that matters for this stage —
 * a test that the resolver returns **nothing** for `/providers`, `/logs`,
 * `/flags`, `/notifications`, a session inventory or an export path. Those
 * screens are honest seams, and a fixture that quietly invented data for them
 * would make the seams untestable and the honesty unverifiable (the FS9 "no
 * placeholder art, fixtures included" rule applied to platform data).
 */
import { describe, expect, it } from 'vitest';
import { resolveFixture } from '@/shared/lib/fixtures/dataset';

const get = (path: string) => resolveFixture('GET', `/api/v1${path}`, 'default');
const post = (path: string) => resolveFixture('POST', `/api/v1${path}`, 'default');

describe('FS12 fixtures — the groups the contract carries', () => {
  it('serves the user roster incl. an unrecognised role', () => {
    const hit = get('/users');
    expect(hit?.status).toBe(200);
    const users = hit?.body as readonly { role: string }[];
    expect(users.length).toBeGreaterThan(4);
    expect(users.some((u) => u.role === 'superuser')).toBe(true);
  });

  it('creates a user with 201 (a create, not an invitation)', () => {
    expect(post('/users')?.status).toBe(201);
  });

  it('revokes sessions with 204 and exposes no session list', () => {
    expect(post('/auth/sessions/revoke')?.status).toBe(204);
    expect(get('/auth/sessions')).toBeUndefined();
    expect(get('/sessions')).toBeUndefined();
  });

  it('serves config versions, one of them WITHOUT a snapshot', () => {
    const rows = get('/config-versions')?.body as readonly { snapshot: unknown }[];
    expect(rows.length).toBe(3);
    expect(rows.some((row) => row.snapshot === null)).toBe(true);
  });

  it('queues a rollback as a 202 intent', () => {
    expect(post('/config-versions/cfg_2/rollback')?.status).toBe(202);
  });

  it('serves the audit log and honours its two documented facets', () => {
    // FS13 added actor-scoped rows for the signed-in fixture users, so a bare
    // count is no longer the right assertion. It is replaced with a STRICTLY
    // STRONGER one (the FS12 precedent for this exact situation): the five FS12
    // rows must still all be present, and each facet must be both sound (every
    // row returned matches) and complete (no matching row is withheld).
    const all = get('/audit-log')?.body as readonly {
      id: string;
      entity: string;
      actor_user_id: string;
    }[];
    for (const id of ['aud_1', 'aud_2', 'aud_3', 'aud_4', 'aud_5']) {
      expect(all.map((row) => row.id)).toContain(id);
    }

    const byEntity = get('/audit-log?entity=user')?.body as readonly {
      id: string;
      entity: string;
    }[];
    expect(byEntity.every((row) => row.entity === 'user')).toBe(true);
    expect(byEntity.map((row) => row.id).sort()).toEqual(
      all
        .filter((row) => row.entity === 'user')
        .map((row) => row.id)
        .sort(),
    );

    const byActor = get('/audit-log?actor=usr_admin')?.body as readonly {
      id: string;
      actor_user_id: string;
    }[];
    expect(byActor.every((row) => row.actor_user_id === 'usr_admin')).toBe(true);
    expect(byActor.map((row) => row.id).sort()).toEqual(
      all
        .filter((row) => row.actor_user_id === 'usr_admin')
        .map((row) => row.id)
        .sort(),
    );
    expect(byActor.length).toBeGreaterThan(0);
  });

  it('carries a create record with a null before and a delete with a null after', () => {
    const rows = get('/audit-log')?.body as readonly {
      before: unknown;
      after: unknown;
    }[];
    expect(rows.some((row) => row.before === null)).toBe(true);
    expect(rows.some((row) => row.after === null)).toBe(true);
  });

  it('serves the admin queue in the CONTRACT status vocabulary', () => {
    const rows = get('/tasks')?.body as readonly { status: string }[];
    const statuses = new Set(rows.map((row) => row.status));
    for (const wire of ['pending', 'succeeded', 'deferred', 'cancelled', 'dead']) {
      expect(statuses.has(wire)).toBe(true);
    }
  });

  it('leaves the FS5 dashboard rows untouched', () => {
    const rows = get('/tasks')?.body as readonly { id: string; status: string }[];
    const fs5 = rows.find((row) => row.id === 'task_pub_9');
    expect(fs5?.status).toBe('queued');
    // No new row is a queued publish, so the FS5 schedule timeline is unmoved.
    const queuedPublish = rows.filter((row) => row.status === 'queued');
    expect(queuedPublish.every((row) => row.id.startsWith('task_pub_'))).toBe(true);
  });

  it('honours the contract filters on /tasks', () => {
    const dead = get('/tasks?status=dead')?.body as readonly { status: string }[];
    expect(dead.every((row) => row.status === 'dead')).toBe(true);
    const scoped = get('/tasks?channel_id=ch_art')?.body as readonly { channel_id: string }[];
    expect(scoped.every((row) => row.channel_id === 'ch_art')).toBe(true);
  });

  it('answers the three task intents with 202', () => {
    for (const intent of ['cancel', 'run', 'requeue']) {
      const hit = post(`/tasks/task_dead_1/${intent}`);
      expect(hit?.status).toBe(202);
    }
  });

  it('serves key slots that carry NO value, and stores nothing on write', () => {
    const slots = get('/api-keys')?.body as readonly Record<string, unknown>[];
    for (const slot of slots) {
      expect(Object.keys(slot)).not.toContain('value');
      expect(Object.keys(slot)).not.toContain('key');
      expect(Object.keys(slot)).not.toContain('secret');
    }
    const write = resolveFixture('PUT', '/api/v1/api-keys', 'default');
    expect(write?.status).toBe(204);
    expect(write?.body).toBeNull();
    // Writing does not change what a subsequent read reports.
    expect(get('/api-keys')?.body).toEqual(slots);
  });

  it('serves readiness with a degraded and an UNRECOGNISED dependency', () => {
    const body = get('/health/ready')?.body as { status: string; checks: Record<string, unknown> };
    expect(body.status).toBe('degraded');
    expect(body.checks['redis']).toEqual({ status: 'degraded', detail: 'Replica lag 4.2s' });
    expect(body.checks['llm_provider']).toMatchObject({ status: 'fake' });
    expect(get('/health/live')?.body).toEqual({ status: 'ok' });
  });

  it('honours the empty scenario', () => {
    expect(resolveFixture('GET', '/api/v1/users', 'empty')?.body).toEqual([]);
    expect(resolveFixture('GET', '/api/v1/audit-log', 'empty')?.body).toEqual([]);
    expect(resolveFixture('GET', '/api/v1/config-versions', 'empty')?.body).toEqual([]);
    expect(resolveFixture('GET', '/api/v1/api-keys', 'empty')?.body).toEqual([]);
  });
});

describe('FS12 NEGATIVE locks — what the contract does not carry, the fixture does not serve', () => {
  const absent = [
    '/providers',
    '/providers/openai',
    '/logs',
    '/logs?level=error',
    '/flags',
    '/feature-flags',
    '/notifications',
    '/audit-log/export',
    '/billing',
    '/billing/invoices',
    '/users/usr_owner/sessions',
  ];

  it.each(absent)('answers nothing for %s', (path) => {
    expect(get(path)).toBeUndefined();
  });

  it('carries no log line, flag row, notification or invoice anywhere', async () => {
    const dataset = (await import('@/shared/lib/fixtures/dataset')) as Record<string, unknown>;
    const exported = Object.keys(dataset).join(' ').toLowerCase();
    expect(exported).not.toContain('logs');
    expect(exported).not.toContain('flag');
    expect(exported).not.toContain('notification');
    expect(exported).not.toContain('invoice');
  });
});
