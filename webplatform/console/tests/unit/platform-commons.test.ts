/**
 * FS12 T-FS12.1 — the ZERO-commons lock, the QUEUE-ROOT independence lock and
 * the platform-wide (channel-free) locks.
 *
 * `/chat` sits at 179 / 180 kB with 1.0 kB of headroom and the FS8 offload
 * lever spent, so all seven FS12 key/path builders live in their entity slices
 * and the two commons modules gain no rows (plan §3.2, owner requirement 2).
 *
 * The second half is the one this stage could not have inherited: three shipped
 * features invalidate the BARE PREFIX `['jobs']`, and TanStack matches keys as
 * an elementwise prefix — so a `'jobs'`-rooted admin key would be swept by a
 * dashboard approve/reject. This file proves the roots are disjoint in BOTH
 * directions (owner requirement 3).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { apiKeyKeys, apiKeyPaths } from '@/entities/api-key';
import { auditKeys, auditPaths } from '@/entities/audit';
import { configVersionKeys, configVersionPaths } from '@/entities/config-version';
import { costReportKeys, costReportPaths } from '@/entities/cost-report';
import { queueKeys, queuePaths } from '@/entities/job-queue';
import { platformUserKeys, platformUserPaths } from '@/entities/platform-user';
import { probeKeys, probePaths } from '@/entities/probe';
import { queryKeys } from '@/shared/config/query-keys';
import { endpoints } from '@/shared/lib/api';

const SRC = join(__dirname, '..', '..', 'src');
const stripComments = (source: string): string => source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

const commonsKeys = stripComments(
  readFileSync(join(SRC, 'shared', 'config', 'query-keys.ts'), 'utf8'),
);
const commonsEndpoints = stripComments(
  readFileSync(join(SRC, 'shared', 'lib', 'api', 'endpoints.ts'), 'utf8'),
);

/** TanStack's partial matching: a filter matches when it is an elementwise prefix. */
function matchesPrefix(filter: readonly unknown[], key: readonly unknown[]): boolean {
  return filter.length <= key.length && filter.every((part, index) => part === key[index]);
}

describe('FS12 zero-commons lock', () => {
  it('adds no key builder to shared/config/query-keys.ts', () => {
    for (const name of [
      'platformUsers',
      'platform-users',
      'configVersions',
      'config-versions',
      'auditKeys',
      'queueKeys',
      'apiKeys',
      'api-keys',
      'costReport',
      'cost-report',
      'probeKeys',
    ]) {
      expect(commonsKeys).not.toContain(name);
    }
  });

  it('adds no path builder to shared/lib/api/endpoints.ts', () => {
    for (const path of ['/users', '/config-versions', '/audit-log', '/tasks', '/api-keys']) {
      expect(commonsEndpoints).not.toContain(path);
    }
  });

  it('keeps the FS1 `health` commons row byte-identical and reuses it', () => {
    // The row already existed and had zero importers; `entities/probe` reuses
    // it for readiness rather than duplicating a key that is already paid for.
    expect(queryKeys.health()).toEqual(['health']);
    expect(commonsEndpoints).toContain("health: () => '/health'");
  });

  it('every FS12 key builder is reachable only from its entity slice', () => {
    expect(platformUserKeys.list()).toEqual(['platform-users', 'list']);
    expect(configVersionKeys.list()).toEqual(['config-versions', 'list']);
    expect(auditKeys.list(null, null)).toEqual(['audit', 'list', 'all', 'all']);
    expect(apiKeyKeys.list()).toEqual(['api-keys', 'list']);
    expect(costReportKeys.byGroup('day')).toEqual(['cost-report', 'day']);
    expect(probeKeys.live()).toEqual(['health', 'live']);
  });
});

describe('FS12 queue-root independence (owner requirement 3)', () => {
  const SHIPPED_JOBS_INVALIDATION = ['jobs'] as const;

  const queueSamples: readonly (readonly unknown[])[] = [
    queueKeys.list(null, null, null),
    queueKeys.list('dead', 'publish', 'ch_tech'),
    queueKeys.detail('task_dead_1'),
  ];

  it('no FS12 queue key starts with `jobs`', () => {
    for (const key of queueSamples) expect(key[0]).not.toBe('jobs');
    for (const key of queueSamples) expect(key[0]).toBe('queue');
  });

  it("the shipped ['jobs'] prefix invalidation cannot match a queue key", () => {
    for (const key of queueSamples) {
      expect(matchesPrefix(SHIPPED_JOBS_INVALIDATION, key)).toBe(false);
    }
  });

  it('a queue invalidation cannot match the FS5 dashboard job keys', () => {
    const fs5List = queryKeys.jobs('all', 'ch_tech');
    const fs5Detail = queryKeys.job('task_pub_9');
    for (const filter of queueSamples) {
      expect(matchesPrefix(filter, fs5List)).toBe(false);
      expect(matchesPrefix(filter, fs5Detail)).toBe(false);
    }
  });

  it('billing keys cannot collide with the FS5 or FS11 cost keys', () => {
    const fs5Cost = queryKeys.cost();
    expect(matchesPrefix(costReportKeys.byGroup('day'), fs5Cost)).toBe(false);
    expect(matchesPrefix(fs5Cost, costReportKeys.byGroup('day'))).toBe(false);
  });
});

describe('FS12 platform-wide locks (the FS10 requirement-A standard)', () => {
  it('no platform key or path builder accepts a channel id, by ARITY', () => {
    // Arity, not call-site inspection: a builder that cannot even take a
    // channel makes "the switcher changes nothing here" structural.
    expect(platformUserKeys.list.length).toBe(0);
    expect(platformUserPaths.list.length).toBe(0);
    expect(platformUserPaths.create.length).toBe(0);
    expect(configVersionKeys.list.length).toBe(0);
    expect(configVersionPaths.list.length).toBe(0);
    expect(apiKeyKeys.list.length).toBe(0);
    expect(apiKeyPaths.list.length).toBe(0);
    expect(apiKeyPaths.write.length).toBe(0);
    expect(probePaths.ready.length).toBe(0);
    expect(probePaths.live.length).toBe(0);
    // Cost takes the contract's own facet and nothing else.
    expect(costReportPaths.byGroup.length).toBe(1);
    expect(costReportKeys.byGroup.length).toBe(1);
    // Audit takes the contract's two documented facets and nothing else.
    expect(auditPaths.list.length).toBe(2);
  });

  it('the platform slices contain no channel vocabulary at all', () => {
    for (const slice of ['platform-user', 'config-version', 'audit', 'api-key', 'probe']) {
      for (const file of ['keys.ts', 'paths.ts', 'hooks.ts', 'model.ts']) {
        const source = stripComments(readFileSync(join(SRC, 'entities', slice, file), 'utf8'));
        expect(source).not.toContain('channelId');
        expect(source).not.toContain('channel_id');
      }
    }
  });

  it('only the queue carries a channel FILTER, because the contract defines one', () => {
    expect(queuePaths.list('pending', 'publish', 'ch_tech')).toBe(
      '/tasks?status=pending&type=publish&channel_id=ch_tech',
    );
    expect(queuePaths.list(null, null, null)).toBe('/tasks');
  });
});

describe('FS12 paths are the frozen contract, verbatim', () => {
  it('writes down only calls API_SPEC carries', () => {
    expect(platformUserPaths.list()).toBe('/users');
    expect(platformUserPaths.role('usr_x')).toBe('/users/usr_x');
    expect(platformUserPaths.revokeSessions()).toBe('/auth/sessions/revoke');
    expect(configVersionPaths.rollback('cfg_1')).toBe('/config-versions/cfg_1/rollback');
    expect(auditPaths.list('user', 'usr_owner')).toBe('/audit-log?entity=user&actor=usr_owner');
    expect(queuePaths.requeue('t1')).toBe('/tasks/t1/requeue');
    expect(apiKeyPaths.write()).toBe('/api-keys');
    expect(probePaths.ready()).toBe('/health/ready');
    expect(probePaths.live()).toBe('/health/live');
    expect(costReportPaths.byGroup('provider')).toBe('/cost?group_by=provider');
  });

  it('writes down no path the contract lacks', () => {
    const slices = ['platform-user', 'config-version', 'audit', 'job-queue', 'api-key', 'probe'];
    const joined = slices
      .map((slice) => stripComments(readFileSync(join(SRC, 'entities', slice, 'paths.ts'), 'utf8')))
      .join('\n');
    for (const absent of ['/providers', '/logs', '/flags', '/notifications', '/sessions']) {
      expect(joined).not.toContain(`'${absent}`);
    }
    // `endpoints` itself must not have grown either.
    expect(Object.keys(endpoints)).toEqual(['auth', 'health', 'aiStream']);
  });
});
