/**
 * Summary prompt builder (FS6 T-FS6.9) — a PURE function so the owner's
 * conditions are unit-provable: gated metrics NEVER enter the prompt (they are
 * named in `limitations` instead), only already-fetched channel-scoped VMs are
 * used, and nothing is inferred client-side. The prompt instructs the model to
 * use ONLY the listed facts.
 */
import type { AnalyticsVM, CostPointVM } from '@/entities/analytics';
import { selectUpcomingPublish, type JobVM } from '@/entities/job';
import type { PostVM } from '@/entities/post';

export interface SummaryInput {
  readonly channelName: string;
  readonly analytics: AnalyticsVM | null;
  readonly costs: readonly CostPointVM[] | null;
  readonly jobs: readonly JobVM[] | null;
  readonly needsReview: readonly PostVM[] | null;
}

export interface SummaryPrompt {
  readonly prompt: string;
  /** Explainability "data used" — exactly what went into the prompt. */
  readonly dataUsed: string;
  /** Explainability "limits" — incl. every gated metric excluded (§R10.3). */
  readonly limitations: string;
}

export function buildSummaryPrompt(input: SummaryInput): SummaryPrompt {
  const facts: string[] = [];
  const used: string[] = [];
  const gatedExcluded: string[] = [];

  if (input.analytics) {
    const { costToday, publishedToday, views, reactions } = input.analytics;
    if (!costToday.gated && costToday.value !== null) {
      facts.push(`- Cost today: $${costToday.value.toFixed(2)}`);
      used.push('cost today');
    }
    if (!publishedToday.gated && publishedToday.value !== null) {
      facts.push(`- Posts published today: ${publishedToday.value}`);
      used.push('published today');
    }
    if (views.gated) gatedExcluded.push('views');
    if (reactions.gated) gatedExcluded.push('reactions');
  }

  if (input.jobs) {
    const upcoming = selectUpcomingPublish(input.jobs);
    facts.push(`- Upcoming scheduled publishes: ${upcoming.length}`);
    used.push('scheduled slots');
    const failed = input.jobs.filter((job) => job.rawStatus === 'failed');
    if (failed.length > 0) {
      facts.push(`- Failed jobs today: ${failed.length}`);
      used.push('failed jobs');
    }
  }

  if (input.needsReview) {
    facts.push(`- Posts waiting for review: ${input.needsReview.length}`);
    used.push('needs-review queue');
  }

  if (input.costs && input.costs.length > 0) {
    const total = input.costs.reduce((sum, point) => sum + point.amountUsd, 0);
    facts.push(`- Cost over the last ${input.costs.length} days: $${total.toFixed(2)}`);
    used.push('cost trend');
  }

  const prompt = [
    `Summarize what changed today for the Telegram channel "${input.channelName}".`,
    'Use ONLY the facts listed below. Do not invent, estimate or extrapolate any number.',
    'Answer with 3 short bullet points and one closing sentence.',
    '',
    'Facts:',
    ...(facts.length > 0 ? facts : ['- No metrics are available right now.']),
  ].join('\n');

  const limitations = [
    gatedExcluded.length > 0
      ? `Engagement metrics (${gatedExcluded.join(', ')}) are gated without a stats adapter and were excluded from the input.`
      : null,
    'The summary is generated and unverified; treat it as a reading aid, not a report.',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    prompt,
    dataUsed:
      used.length > 0
        ? `Today's ${used.join(', ')} for “${input.channelName}” — the same numbers shown on this dashboard.`
        : 'No metrics were available; the model was told so.',
    limitations,
  };
}
