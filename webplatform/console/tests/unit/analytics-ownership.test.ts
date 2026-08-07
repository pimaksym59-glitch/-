/**
 * FS11 T-FS11.11 — the §3.4 state-ownership locks and the §3.7 regression
 * locks, as source-level assertions rather than review promises.
 *
 * The hard rule: **no state is owned by TanStack Query and Zustand at once**.
 * The stage-specific rule: the frozen §Analytics & Cost group is READ-ONLY, so
 * FS11 must contain **no mutation and no cache write at all** (invariant I5).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { toCsv } from '@/features/export-analytics';
import type { SeriesVM } from '@/entities/analytics-report';

const SRC = join(__dirname, '..', '..', 'src');
const stripComments = (source: string): string => source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

const FS11_FILES = [
  ['entities', 'analytics-report', 'keys.ts'],
  ['entities', 'analytics-report', 'paths.ts'],
  ['entities', 'analytics-report', 'report-model.ts'],
  ['entities', 'analytics-report', 'report-hooks.ts'],
  ['features', 'filter-analytics', 'model', 'range.ts'],
  ['features', 'filter-analytics', 'model', 'useAnalyticsRange.ts'],
  ['features', 'filter-analytics', 'ui', 'RangeControls.tsx'],
  ['features', 'export-analytics', 'model', 'toCsv.ts'],
  ['features', 'export-analytics', 'ui', 'ExportMenu.tsx'],
  ['features', 'explain-metrics', 'model', 'buildMetricsPrompt.ts'],
  ['features', 'explain-metrics', 'ui', 'ExplainMetricsPanel.tsx'],
  ['widgets', 'analytics', 'AnalyticsView.tsx'],
  ['widgets', 'analytics', 'CostPanel.tsx'],
  ['widgets', 'analytics', 'QualityPanel.tsx'],
  ['widgets', 'analytics', 'TrendsPanel.tsx'],
  ['widgets', 'analytics', 'ReportPanel.tsx'],
  ['widgets', 'analytics', 'MetricRow.tsx'],
  ['widgets', 'analytics', 'MetricList.tsx'],
  ['widgets', 'analytics', 'GatedPanel.tsx'],
  ['widgets', 'analytics', 'PanelFrame.tsx'],
  ['widgets', 'analytics', 'AnalyticsHonesty.tsx'],
  ['widgets', 'analytics', 'AnalyticsEmpty.tsx'],
  ['widgets', 'inspector', 'DatapointInspector.tsx'],
].map((parts) => ({
  path: parts.join('/'),
  source: stripComments(readFileSync(join(SRC, ...parts), 'utf8')),
}));

describe('I5 — FS11 is READ-ONLY, because the contract is', () => {
  it('contains no mutation, no invalidation and no cache write anywhere', () => {
    for (const file of FS11_FILES) {
      expect(file.source, file.path).not.toMatch(/useMutation/);
      expect(file.source, file.path).not.toMatch(/invalidateQueries/);
      expect(file.source, file.path).not.toMatch(/setQueryData/);
    }
  });

  it('never references another surface’s keys or paths', () => {
    for (const file of FS11_FILES) {
      expect(file.source, file.path).not.toMatch(
        /documentPaths|personaPaths|actorPaths|imagePaths|locationPaths|promptPaths/,
      );
      expect(file.source, file.path).not.toMatch(/queryKeys\.(documents|personas|actors|images)/);
    }
  });
});

describe('§3.4 — no state is owned by Query and Zustand at once', () => {
  it('the AI panel writes nothing to Query', () => {
    const panel = FS11_FILES.find((f) => f.path.endsWith('ExplainMetricsPanel.tsx'));
    expect(panel?.source).not.toMatch(/useQueryClient|queryClient/);
    // It reaches the relay ONLY through the public hook (I3/I6).
    expect(panel?.source).toMatch(/useAssistantStream/);
    expect(panel?.source).not.toMatch(/ai-gateway|studio\/dry-run/);
  });

  it('no FS11 module writes the global UI store', () => {
    for (const file of FS11_FILES) {
      expect(file.source, file.path).not.toMatch(/useUiStore\.setState/);
      expect(file.source, file.path).not.toMatch(/setState\(/);
    }
  });

  it('the assistant namespace cannot collide with a Query key', () => {
    const panel = FS11_FILES.find((f) => f.path.endsWith('ExplainMetricsPanel.tsx'));
    // `analytics:<channel>:<range>` is a STRING key in the transient store;
    // Query keys on this surface are arrays beginning with 'analytics'/'cost'.
    expect(panel?.source).toMatch(/`analytics:\$\{channelId\}:\$\{rangeLabel\}`/);
  });

  it('FS11 owns no draft and touches no storage', () => {
    for (const file of FS11_FILES) {
      expect(file.source, file.path).not.toMatch(/shared\/lib\/persist/);
      expect(file.source, file.path).not.toMatch(/localStorage/);
    }
  });

  it('the presentational panels are stateless', () => {
    for (const name of [
      'GatedPanel.tsx',
      'MetricList.tsx',
      'AnalyticsHonesty.tsx',
      'PanelFrame.tsx',
    ]) {
      const file = FS11_FILES.find((f) => f.path.endsWith(name));
      expect(file?.source, name).not.toMatch(/useState|useReducer|useEffect/);
    }
  });
});

describe('I3/I6 — the protected surfaces gain no new adjustment point', () => {
  it('no FS11 module imports another stage’s entity or the AI gateway', () => {
    for (const file of FS11_FILES) {
      expect(file.source, file.path).not.toMatch(
        /entities\/(document|persona|actor|image|location|prompt|conversation)/,
      );
      expect(file.source, file.path).not.toMatch(/shared\/lib\/ai-gateway/);
    }
  });

  it('the FS11 slice never imports the FS5 analytics slice (no cross-entity import)', () => {
    for (const file of FS11_FILES.filter((f) => f.path.startsWith('entities/'))) {
      expect(file.source, file.path).not.toMatch(/entities\/analytics'/);
    }
  });
});

describe('the CSV is a projection of loaded data, never a claim', () => {
  const series: readonly SeriesVM[] = [
    {
      key: 'cost_by_day',
      label: 'Cost by day',
      rawKey: false,
      unit: 'USD',
      gated: false,
      points: [
        { key: '2026-07-29', value: 6.8 },
        { key: '2026-07-30', value: 6.93 },
      ],
    },
    { key: 'views', label: 'Views', rawKey: false, unit: null, gated: true, points: [] },
  ];

  it('serializes exactly the served points', () => {
    const { csv, rowCount } = toCsv(series);
    expect(csv.split('\n')).toEqual(['key,Cost by day', '2026-07-29,6.8', '2026-07-30,6.93']);
    expect(rowCount).toBe(2);
  });

  it('excludes gated series and names them', () => {
    expect(toCsv(series).excluded).toEqual(['Views']);
    expect(toCsv(series).csv).not.toContain('Views');
  });

  it('quotes separators rather than corrupting a row', () => {
    const { csv } = toCsv([
      {
        key: 'k',
        label: 'Cost, total',
        rawKey: false,
        unit: null,
        gated: false,
        points: [{ key: 'a,b', value: 1 }],
      },
    ]);
    expect(csv).toContain('"Cost, total"');
    expect(csv).toContain('"a,b",1');
  });

  it('computes nothing — no totals, no averages, no rates', () => {
    const source = stripComments(
      readFileSync(join(SRC, 'features', 'export-analytics', 'model', 'toCsv.ts'), 'utf8'),
    );
    expect(source).not.toMatch(/reduce|average|total|sum|percent/i);
  });
});
