/**
 * Query keys for the FS11 analytics surface — **entity-local by design**
 * (FS11 T-FS11.1; the FS9/FS10 mechanism, now the default).
 *
 * `/chat` sits at **179 / 180 kB** with 1.0 kB of headroom and no cheap
 * structural lever left, so analytics-only key builders live HERE and
 * `shared/config/query-keys.ts` gains **zero rows** (plan §3.1/§3.2).
 *
 * ## Why these namespaces look the way they do
 *
 * FS5 already put two analytics keys in commons, and the dashboard depends on
 * them: `queryKeys.analytics(channelId) = ['analytics', channelId]` and
 * `queryKeys.cost() = ['cost', 'by-day']`. Both stay byte-identical (plan §3.3).
 *
 * `features/review-post` invalidates `['analytics', channelId]` after a 202
 * review intent. TanStack Query matches keys **positionally**, so every key
 * below puts a **literal** in position 1 (`'range'`, `'quality'`, `'trends'`,
 * `'report'`, `'group'`) — a channel id can never appear there. That makes the
 * two surfaces provably unable to invalidate or stale each other, in either
 * direction, and `tests/unit/analytics-commons.test.ts` fails if that ever
 * stops being true.
 *
 * Every key carries the range it was fetched with, so a range change is a NEW
 * key rather than an invalidation: the previous range stays cached and Back
 * returns to it instantly (D3 §12 "Cached: last range").
 */
import type { CostGroupBy, DateRange, ReportPeriod } from './paths';

/** `null` is spelled explicitly so two different ranges can never share a key. */
function rangePart(range: DateRange): readonly [string, string] {
  return [range.from ?? '*', range.to ?? '*'] as const;
}

export const analyticsKeys = {
  /** The channel snapshot for one range. */
  snapshot: (channelId: string, range: DateRange) =>
    ['analytics', 'range', channelId, ...rangePart(range)] as const,
  /** Cost by facet for one range. Distinct from FS5's `['cost','by-day']`. */
  costBy: (groupBy: CostGroupBy, range: DateRange) =>
    ['cost', 'group', groupBy, ...rangePart(range)] as const,
  /** Quality / similarity / regen for one range. */
  quality: (range: DateRange) => ['analytics', 'quality', ...rangePart(range)] as const,
  /** Trend detection for one range. */
  trends: (range: DateRange) => ['analytics', 'trends', ...rangePart(range)] as const,
  /** A period report (the report endpoint takes no range). */
  report: (period: ReportPeriod) => ['analytics', 'report', period] as const,
} as const;
