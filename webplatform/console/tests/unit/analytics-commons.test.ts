/**
 * FS11 T-FS11.1 — the ZERO-commons lock **and** the FS5-coexistence lock.
 *
 * `/chat` sits at 179 / 180 kB with 1.0 kB of headroom and no cheap structural
 * lever left, so the range-scoped analytics key/path builders live in their
 * ENTITY slice and `shared/config/query-keys.ts` / `shared/lib/api/endpoints.ts`
 * gain no rows (plan §3.1/§3.2/§6.3.6).
 *
 * The second half is specific to this stage and is the reason `/dashboard` is
 * the primary protected route: FS11 extends the entity FS5 already ships. Two
 * FS5 keys live in commons and the dashboard depends on them —
 * `queryKeys.analytics(channelId)` and `queryKeys.cost()` — and
 * `features/review-post` invalidates `['analytics', channelId]` after every 202
 * review intent. TanStack Query matches keys POSITIONALLY, so this file proves,
 * in both directions, that an FS5 invalidation can never reach an FS11 range
 * query and that an FS11 key can never be mistaken for an FS5 one.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  analyticsKeys,
  analyticsPaths,
  COST_GROUP_BY,
  REPORT_PERIODS,
} from '@/entities/analytics-report';
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

const RANGE = { from: '2026-07-05', to: '2026-08-03' } as const;

describe('analytics commons discipline (plan §3.1/§3.2)', () => {
  it('shared query-keys gains NO FS11 builders', () => {
    for (const name of ['snapshot', 'costBy', 'quality', 'trends', 'report']) {
      expect(Object.keys(queryKeys)).not.toContain(name);
    }
    expect(commonsKeys).not.toMatch(/analyticsKeys|costBy|analyticsPaths/);
  });

  it('the FS5 commons rows are untouched (the dashboard depends on them)', () => {
    // Byte-level intent: the two builders still exist with their exact shapes.
    expect(queryKeys.analytics('ch_tech')).toEqual(['analytics', 'ch_tech']);
    expect(queryKeys.cost()).toEqual(['cost', 'by-day']);
    expect(commonsKeys).toMatch(/analytics:\s*\(channelId: string\) =>/);
    expect(commonsKeys).toMatch(/cost:\s*\(\) =>/);
  });

  it('shared endpoints gains NO analytics paths', () => {
    expect(commonsEndpoints).not.toMatch(/analyticsPaths|\/analytics\/|group_by/);
    expect(Object.keys(endpoints)).not.toContain('analytics');
    expect(Object.keys(endpoints)).not.toContain('cost');
  });

  it('the analytics slice never imports the shared key registry from its FS11 files', () => {
    for (const file of ['keys.ts', 'paths.ts', 'report-model.ts', 'report-hooks.ts']) {
      const source = stripComments(
        readFileSync(join(SRC, 'entities', 'analytics-report', file), 'utf8'),
      );
      expect(source).not.toMatch(/shared\/config\/query-keys/);
      expect(source).not.toMatch(/shared\/lib\/api\/endpoints/);
    }
  });
});

describe('FS11 keys cannot collide with the FS5 dashboard keys (both directions)', () => {
  const fs11 = [
    analyticsKeys.snapshot('ch_tech', RANGE),
    analyticsKeys.quality(RANGE),
    analyticsKeys.trends(RANGE),
    analyticsKeys.report('daily'),
    analyticsKeys.costBy('day', RANGE),
    analyticsKeys.costBy('model', RANGE),
  ];

  it('every FS11 key puts a LITERAL in position 1, never a channel id', () => {
    for (const key of fs11) {
      expect(['range', 'quality', 'trends', 'report', 'group']).toContain(String(key[1]));
      expect(String(key[1])).not.toMatch(/^ch_/);
    }
  });

  it("review-post's invalidation ['analytics', channelId] matches NO FS11 key", () => {
    const reviewFilter = queryKeys.analytics('ch_tech');
    for (const key of fs11) {
      expect(matchesPrefix(reviewFilter, key)).toBe(false);
    }
    // …and it still matches its own FS5 target.
    expect(matchesPrefix(reviewFilter, queryKeys.analytics('ch_tech'))).toBe(true);
  });

  it('no FS11 key matches the FS5 cost key, and no FS11 filter reaches an FS5 query', () => {
    expect(matchesPrefix(analyticsKeys.costBy('day', RANGE), queryKeys.cost())).toBe(false);
    expect(matchesPrefix(queryKeys.cost(), analyticsKeys.costBy('day', RANGE))).toBe(false);
    for (const key of fs11) {
      expect(matchesPrefix(key, queryKeys.analytics('ch_tech'))).toBe(false);
    }
  });

  it('two different ranges never share a key (a range change is a new key, not an invalidation)', () => {
    const a = analyticsKeys.snapshot('ch_tech', { from: '2026-07-05', to: '2026-08-03' });
    const b = analyticsKeys.snapshot('ch_tech', { from: '2026-06-05', to: '2026-08-03' });
    const open = analyticsKeys.snapshot('ch_tech', { from: null, to: null });
    expect(a).not.toEqual(b);
    expect(open).toEqual(['analytics', 'range', 'ch_tech', '*', '*']);
  });
});

describe('analytics paths are the five frozen READ calls and nothing else', () => {
  it('exposes no write, export, forecast or anomaly builder', () => {
    expect(Object.keys(analyticsPaths).sort()).toEqual([
      'cost',
      'quality',
      'report',
      'snapshot',
      'trends',
    ]);
    const source = stripComments(
      readFileSync(join(SRC, 'entities', 'analytics-report', 'paths.ts'), 'utf8'),
    );
    expect(source).not.toMatch(/export=|forecast|anomal|recommend|experiment|diversity/i);
  });

  it('builds the contract paths verbatim, with the range as the contract spells it', () => {
    expect(analyticsPaths.snapshot('ch_tech', RANGE)).toBe(
      '/analytics/channels/ch_tech?from=2026-07-05&to=2026-08-03',
    );
    expect(analyticsPaths.snapshot('ch_tech', { from: null, to: null })).toBe(
      '/analytics/channels/ch_tech',
    );
    expect(analyticsPaths.cost('model', RANGE)).toBe(
      '/cost?group_by=model&from=2026-07-05&to=2026-08-03',
    );
    expect(analyticsPaths.cost('day', { from: null, to: null })).toBe('/cost?group_by=day');
    expect(analyticsPaths.quality(RANGE)).toBe('/analytics/quality?from=2026-07-05&to=2026-08-03');
    expect(analyticsPaths.trends({ from: null, to: null })).toBe('/analytics/trends');
    expect(analyticsPaths.report('weekly')).toBe('/analytics/reports/weekly');
  });

  it('only the documented facet and period values are reachable', () => {
    expect([...COST_GROUP_BY]).toEqual(['day', 'channel', 'model', 'provider']);
    expect([...REPORT_PERIODS]).toEqual(['daily', 'weekly', 'monthly']);
  });
});
