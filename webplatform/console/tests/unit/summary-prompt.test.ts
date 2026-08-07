/**
 * buildSummaryPrompt (FS6 T-FS6.9 — the owner's condition 4, unit-provable):
 * gated metrics NEVER enter the prompt and ARE named in the limitations; only
 * listed facts go in; the model is told not to invent numbers.
 */
import { describe, expect, it } from 'vitest';
import { mapAnalytics, mapCost } from '@/entities/analytics';
import { mapJob } from '@/entities/job';
import { mapPost } from '@/entities/post';
import { ANALYTICS, COST_BY_DAY, POSTS, TASKS } from '@/shared/lib/fixtures/dataset';
import { buildSummaryPrompt } from '@/widgets/dashboard';

const analyticsWire = ANALYTICS['ch_tech'];
if (!analyticsWire) throw new Error('fixture dataset must model ch_tech');

const INPUT = {
  channelName: 'Tech Digest',
  analytics: mapAnalytics(analyticsWire),
  costs: mapCost(COST_BY_DAY),
  jobs: TASKS.filter((t) => t.channel_id === 'ch_tech').map(mapJob),
  needsReview: POSTS.filter((p) => p.channel_id === 'ch_tech' && p.status === 'needs_review').map(
    mapPost,
  ),
};

describe('buildSummaryPrompt (FS6 T-FS6.9)', () => {
  it('includes only available facts and forbids invention', () => {
    const built = buildSummaryPrompt(INPUT);
    expect(built.prompt).toContain('Cost today: $4.82');
    expect(built.prompt).toContain('Posts published today: 3');
    expect(built.prompt).toContain('Upcoming scheduled publishes: 2');
    expect(built.prompt).toContain('Posts waiting for review: 2');
    expect(built.prompt).toContain('Do not invent, estimate or extrapolate any number.');
  });

  it('GATED metrics never enter the prompt and are named in the limitations (§R10.3)', () => {
    const built = buildSummaryPrompt(INPUT);
    expect(built.prompt.toLowerCase()).not.toContain('views');
    expect(built.prompt.toLowerCase()).not.toContain('reactions');
    expect(built.limitations).toContain('views');
    expect(built.limitations).toContain('reactions');
    expect(built.limitations).toContain('gated');
  });

  it('a gated metric with a smuggled wire number STILL never appears', () => {
    const built = buildSummaryPrompt({
      ...INPUT,
      analytics: {
        ...INPUT.analytics,
        views: { value: 12345, gated: true },
      },
    });
    expect(built.prompt).not.toContain('12345');
  });

  it('with no data at all, the model is told there are no metrics', () => {
    const built = buildSummaryPrompt({
      channelName: 'Empty',
      analytics: null,
      costs: null,
      jobs: null,
      needsReview: null,
    });
    expect(built.prompt).toContain('No metrics are available right now.');
    expect(built.dataUsed).toContain('No metrics were available');
  });

  it('dataUsed names exactly what was sent (Explainability truth)', () => {
    const built = buildSummaryPrompt(INPUT);
    expect(built.dataUsed).toContain('cost today');
    expect(built.dataUsed).toContain('needs-review queue');
    expect(built.dataUsed).toContain('Tech Digest');
  });
});
