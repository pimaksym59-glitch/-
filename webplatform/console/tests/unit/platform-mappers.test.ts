/**
 * FS12 mapper honesty. Each block proves one rule the screens depend on:
 *  - D14 (owner-ruled): only the five exact ONYX equivalents are mapped, and
 *    `deferred`/`cancelled`/`dead` survive as explicit RAW labels;
 *  - an unrecognised role, probe state or jsonb key renders RAW, never coerced;
 *  - a null `before` is a CREATE and is never padded into an empty object;
 *  - the api-key VM has no field able to hold a secret.
 */
import { describe, expect, it } from 'vitest';
import { mapApiKeySlot, countConfigured } from '@/entities/api-key';
import { diffAuditRecord, mapAuditRecord } from '@/entities/audit';
import { diffSnapshots, countChanges, mapConfigVersion } from '@/entities/config-version';
import { mapCostReport, parseCostGroup } from '@/entities/cost-report';
import { allowedIntents, mapQueueTask, sortQueueTasks } from '@/entities/job-queue';
import { mapPlatformUser, countOwners } from '@/entities/platform-user';
import { mapReadiness, parseProbeState } from '@/entities/probe';
import { STATUS } from '@/shared/types/status';

const task = (status: string, extra: Record<string, unknown> = {}) =>
  mapQueueTask({
    id: `t_${status}`,
    type: 'publish',
    status,
    attempts: 1,
    created_at: '2026-07-30T08:00:00Z',
    ...extra,
  } as never);

describe('D14 — task status mapping (owner-ruled Option B)', () => {
  it('maps only the five statuses with an EXACT ONYX equivalent', () => {
    expect(task('pending').status).toBe(STATUS.queued);
    expect(task('running').status).toBe(STATUS.running);
    expect(task('succeeded').status).toBe(STATUS.completed);
    expect(task('failed').status).toBe(STATUS.failed);
    expect(task('needs_review').status).toBe(STATUS.needsReview);
  });

  it('leaves deferred/cancelled/dead UNMAPPED with an explicit raw label', () => {
    for (const [wire, label] of [
      ['deferred', 'Deferred'],
      ['cancelled', 'Cancelled'],
      ['dead', 'Dead (DLQ)'],
    ] as const) {
      const vm = task(wire);
      expect(vm.status).toBeNull();
      expect(vm.rawStatusLabel).toBe(label);
      expect(vm.rawStatus).toBe(wire);
    }
  });

  it('never collapses dead into failed — they allow different intents', () => {
    expect(allowedIntents(task('dead'))).toEqual({ cancel: false, run: false, requeue: true });
    expect(allowedIntents(task('failed'))).toEqual({ cancel: false, run: true, requeue: false });
    expect(allowedIntents(task('cancelled'))).toEqual({
      cancel: false,
      run: false,
      requeue: false,
    });
  });

  it('keeps an unknown wire status raw rather than inventing a badge', () => {
    const vm = task('quantum');
    expect(vm.status).toBeNull();
    expect(vm.rawStatusLabel).toBe('quantum');
  });

  it('reads last_error or error, and invents neither', () => {
    expect(task('failed', { last_error: 'boom' }).error).toBe('boom');
    expect(task('failed', { error: 'legacy' }).error).toBe('legacy');
    expect(task('failed').error).toBeNull();
  });

  it('sorts attention first (dead, needs_review, failed)', () => {
    const sorted = sortQueueTasks([task('succeeded'), task('dead'), task('running')]);
    expect(sorted.map((t) => t.rawStatus)).toEqual(['dead', 'running', 'succeeded']);
  });
});

describe('users', () => {
  it('keeps an unrecognised role raw and unmapped', () => {
    const vm = mapPlatformUser({ id: 'u1', email: 'a@b.c', role: 'superuser' });
    expect(vm.role).toBeNull();
    expect(vm.rawRole).toBe('superuser');
  });

  it('drops anything a wire volunteers beyond the mirror (no secret can survive)', () => {
    const vm = mapPlatformUser({
      id: 'u1',
      email: 'a@b.c',
      role: 'owner',
      password_hash: 'x',
      mfa_secret_ref: 'y',
    } as never);
    expect(Object.keys(vm).sort()).toEqual([
      'createdAt',
      'email',
      'id',
      'rawRole',
      'role',
      'status',
    ]);
    expect(JSON.stringify(vm)).not.toContain('x');
    expect(JSON.stringify(vm)).not.toContain('y');
  });

  it('counts owners as a plain fact', () => {
    expect(
      countOwners([
        mapPlatformUser({ id: '1', email: 'a', role: 'owner' }),
        mapPlatformUser({ id: '2', email: 'b', role: 'admin' }),
      ]),
    ).toBe(1);
  });
});

describe('audit records', () => {
  it('treats a null before as CREATE and never pads it', () => {
    const vm = mapAuditRecord({
      id: 'a1',
      action: 'channel.created',
      entity: 'channel',
      before: null,
      after: { title: 'x' },
    });
    expect(vm.changeKind).toBe('created');
    expect(vm.before).toBeNull();
    const rows = diffAuditRecord(vm);
    expect(rows).toEqual([{ key: 'title', before: null, after: 'x', kind: 'added' }]);
  });

  it('treats a null after as DELETE', () => {
    const vm = mapAuditRecord({
      id: 'a2',
      action: 'document.deleted',
      entity: 'document',
      before: { title: 'x' },
      after: null,
    });
    expect(vm.changeKind).toBe('deleted');
    expect(diffAuditRecord(vm)[0]?.kind).toBe('removed');
  });

  it('surfaces an unrecognised key by its RAW name', () => {
    const vm = mapAuditRecord({
      id: 'a3',
      action: 'config.updated',
      entity: 'config',
      before: { experimental_reranker: 'v1' },
      after: { experimental_reranker: 'v2' },
    });
    const rows = diffAuditRecord(vm);
    expect(rows[0]?.key).toBe('experimental_reranker');
    expect(rows[0]?.kind).toBe('changed');
  });

  it('keeps the actor a raw id', () => {
    const vm = mapAuditRecord({
      id: 'a4',
      action: 'x',
      entity: 'user',
      actor_user_id: 'usr_owner',
    });
    expect(vm.actorId).toBe('usr_owner');
  });
});

describe('config versions', () => {
  it('marks a version with no snapshot as not comparable', () => {
    expect(mapConfigVersion({ id: 'c1', snapshot: null }).hasSnapshot).toBe(false);
    expect(mapConfigVersion({ id: 'c2', snapshot: { a: 1 } }).hasSnapshot).toBe(true);
  });

  it('diffs the union of both key sets, sorted, marking each row', () => {
    const rows = diffSnapshots({ a: 1, b: 2 }, { b: 3, c: 4 });
    expect(rows.map((r) => [r.key, r.kind])).toEqual([
      ['a', 'removed'],
      ['b', 'changed'],
      ['c', 'added'],
    ]);
    expect(countChanges(rows)).toBe(3);
  });

  it('reports unchanged keys as unchanged rather than hiding them', () => {
    const rows = diffSnapshots({ a: 1 }, { a: 1 });
    expect(rows[0]?.kind).toBe('unchanged');
    expect(countChanges(rows)).toBe(0);
  });
});

describe('health probes', () => {
  it('maps unknown states to grey, keeping the wire word', () => {
    expect(parseProbeState('fake')).toBe('unknown');
    expect(parseProbeState('ok')).toBe('healthy');
    expect(parseProbeState('degraded')).toBe('degraded');
    expect(parseProbeState('down')).toBe('down');
  });

  it('reads a nested check map and preserves an unrecognised state', () => {
    const vm = mapReadiness({
      status: 'degraded',
      checks: {
        postgres: { status: 'ok' },
        llm_provider: { status: 'fake', detail: 'Deterministic fake' },
      },
    });
    expect(vm.overall).toBe('degraded');
    expect(vm.hasProbeDetail).toBe(true);
    const provider = vm.probes.find((p) => p.name === 'llm_provider');
    expect(provider?.state).toBe('unknown');
    expect(provider?.rawState).toBe('fake');
    expect(provider?.detail).toBe('Deterministic fake');
  });

  it('reports NO probe detail rather than deriving one', () => {
    const vm = mapReadiness({ status: 'ok' });
    expect(vm.probes).toEqual([]);
    expect(vm.hasProbeDetail).toBe(false);
  });
});

describe('api key slots', () => {
  it('produces no field capable of holding a value', () => {
    const vm = mapApiKeySlot({ name: 'openai', kind: 'llm', configured: true }, 0);
    expect(Object.keys(vm).sort()).toEqual(['configured', 'id', 'kind', 'label', 'updatedAt']);
  });

  it('drops a value a wire volunteers', () => {
    const vm = mapApiKeySlot({ name: 'openai', value: 'sk-secret', key: 'sk-secret' } as never, 0);
    expect(JSON.stringify(vm)).not.toContain('sk-secret');
  });

  it('counts unknown presence as unknown, not as "not configured"', () => {
    const slots = [
      mapApiKeySlot({ name: 'a', configured: true }, 0),
      mapApiKeySlot({ name: 'b', configured: null }, 1),
      mapApiKeySlot({ name: 'c', configured: false }, 2),
    ];
    expect(countConfigured(slots)).toEqual({ configured: 1, unknown: 1 });
  });
});

describe('cost report (billing)', () => {
  it('sums the served rows and computes no projection', () => {
    const vm = mapCostReport('provider', [
      { key: 'openai', amount_usd: 3 },
      { key: 'replicate', amount_usd: 1 },
    ]);
    expect(vm.totalUsd).toBe(4);
    expect(vm.rows[0]?.key).toBe('openai');
    expect(vm.rows[0]?.share).toBeCloseTo(0.75);
    expect(Object.keys(vm).sort()).toEqual(['group', 'rows', 'totalUsd']);
  });

  it('orders a day facet chronologically and other facets by magnitude', () => {
    const day = mapCostReport('day', [
      { key: '2026-07-30', amount_usd: 1 },
      { key: '2026-07-29', amount_usd: 5 },
    ]);
    expect(day.rows.map((r) => r.key)).toEqual(['2026-07-29', '2026-07-30']);
  });

  it('falls back to the contract default for an unknown facet', () => {
    expect(parseCostGroup('nonsense')).toBe('day');
    expect(parseCostGroup(null)).toBe('day');
    expect(parseCostGroup('model')).toBe('model');
  });
});
