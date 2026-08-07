/**
 * Honest-absence surfaces (FS11 T-FS11.10, plan §5.2 D3/D4/D5/D6/D8/D9). D3 §12
 * describes anomaly callouts, cost forecasting, recommendations, experiments, a
 * System panel and live counters. The frozen §Analytics & Cost group is five
 * READ calls. Everything it cannot back is named here rather than simulated
 * (the FS7 retrieval-honesty, FS8 memory-honesty, FS9 studio-honesty and FS10
 * prompts-honesty precedents).
 */
import { Activity, FlaskConical, Lightbulb, RadioTower, TrendingUp } from 'lucide-react';

type Variant = 'anomalies' | 'forecast' | 'recommendations' | 'system' | 'liveness';

const CONTENT: Readonly<Record<Variant, { icon: typeof Activity; title: string; body: string }>> = {
  anomalies: {
    icon: Activity,
    title: 'Nothing here is flagged as an anomaly',
    body:
      'The contract exposes no anomaly detection and no anomaly flag on any metric, so this console ' +
      'never labels a movement a spike, a regression or a problem. It shows the numbers the API ' +
      'served and leaves the judgement to you — a coloured warning this data cannot justify would be ' +
      'a guess wearing a badge.',
  },
  forecast: {
    icon: TrendingUp,
    title: 'Cost history is real; a forecast is not offered',
    body:
      'Cost forecasting is a backend capability (§R11.8), but no endpoint exposes a projection, so ' +
      'this page plots what was actually spent and stops there. No trend line here is extrapolated, ' +
      'and no number on this screen predicts a future bill.',
  },
  recommendations: {
    icon: Lightbulb,
    title: 'No recommendations, and no A/B experiments',
    body:
      'Analytics provides data, it does not decide (§R11.2), and the contract exposes no ' +
      'recommendation or experiment endpoint. There is also a structural reason A/B testing is ' +
      'absent: a channel broadcasts one post to everyone, so an audience split is impossible ' +
      '(§R11.5). Only temporal and cross-channel comparisons are meaningful, and both carry ' +
      'confounders.',
  },
  system: {
    icon: RadioTower,
    title: 'System health lives elsewhere',
    body:
      'The frozen contract exposes no system-analytics endpoint. Liveness and readiness are health ' +
      'probes, and queue state belongs to the task monitor — both are their own screens. This page ' +
      'deliberately derives no system metric from unrelated endpoints, because a made-up uptime ' +
      'number is worse than none.',
  },
  liveness: {
    icon: FlaskConical,
    title: 'These numbers are fetched, not streamed',
    body:
      'There is no analytics stream or push in the contract, so nothing here ticks by itself. Each ' +
      'panel states when it was fetched and can be refreshed on demand — a counter that animated ' +
      'without a live source would imply a freshness the backend never promised.',
  },
};

export function AnalyticsHonesty({
  variant,
  className,
}: {
  readonly variant: Variant;
  readonly className?: string;
}): React.ReactElement {
  const { icon: Icon, title, body } = CONTENT[variant];
  const headingId = `analytics-honesty-${variant}`;
  return (
    <section
      aria-labelledby={headingId}
      className={`rounded-xl border border-border-default bg-surface p-4 ${className ?? ''}`}
    >
      <div className="flex items-center gap-2">
        <Icon aria-hidden className="size-4 text-secondary" strokeWidth={1.5} />
        <h2 id={headingId} className="text-sm font-semibold text-primary">
          {title}
        </h2>
      </div>
      <p className="mt-2 text-sm text-secondary">{body}</p>
    </section>
  );
}
