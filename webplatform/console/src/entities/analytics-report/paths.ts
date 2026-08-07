/**
 * The frozen §Analytics & Cost calls, verbatim (API_SPEC "Analytics & Cost
 * (§R10.3, R11 — чтение всем ролям)"). Entity-local (the FS7 `documentPaths`
 * precedent — commons stay untouched, plan §3.1/§3.6).
 *
 * The group is **five READ calls and nothing else**:
 *   GET /analytics/channels/{id}?from=&to=   channel snapshot (engagement carries
 *                                            `availability: available|gated`)
 *   GET /analytics/reports/{daily|weekly|monthly}
 *   GET /analytics/trends
 *   GET /analytics/quality
 *   GET /cost?group_by=channel|model|provider|day
 *
 * There is deliberately **no** create/update/delete/export/forecast/anomaly
 * builder here: the contract carries no write on this group at all, so the
 * Analytics screen renders no mutation affordance and no server-side export
 * (plan §5.2 D3/D4/D5/D9). A path that cannot be called is never written down.
 *
 * FS5's dashboard calls (`/analytics/channels/{id}` without a range and
 * `/cost?group_by=day`) are inlined in `hooks.ts` and stay BYTE-IDENTICAL — this
 * module is additive only (plan §3.3).
 */

/** The three report periods the contract documents — nothing else is callable. */
export const REPORT_PERIODS = ['daily', 'weekly', 'monthly'] as const;
export type ReportPeriod = (typeof REPORT_PERIODS)[number];

/** The four cost facets the contract documents — nothing else is callable. */
export const COST_GROUP_BY = ['day', 'channel', 'model', 'provider'] as const;
export type CostGroupBy = (typeof COST_GROUP_BY)[number];

/** An inclusive ISO date window; `null` on either side means "not sent". */
export interface DateRange {
  readonly from: string | null;
  readonly to: string | null;
}

function rangeQuery(range: DateRange): string {
  const parts: string[] = [];
  if (range.from) parts.push(`from=${encodeURIComponent(range.from)}`);
  if (range.to) parts.push(`to=${encodeURIComponent(range.to)}`);
  return parts.length === 0 ? '' : `?${parts.join('&')}`;
}

export const analyticsPaths = {
  /** GET — the channel snapshot, narrowed by the contract's own `?from=&to=`. */
  snapshot: (channelId: string, range: DateRange) =>
    `/analytics/channels/${encodeURIComponent(channelId)}${rangeQuery(range)}`,
  /**
   * GET — cost by one of the four documented facets (§R11.8: the reliable
   * source). The range is appended only when the caller has one; whether the
   * live endpoint honours it is FE-RV-14's question, and the UI states which
   * filters it actually sent rather than assuming.
   */
  cost: (groupBy: CostGroupBy, range: DateRange) => {
    const rest = rangeQuery(range).replace('?', '&');
    return `/cost?group_by=${groupBy}${rest}`;
  },
  /** GET — quality / similarity / regen (§R11.7). */
  quality: (range: DateRange) => `/analytics/quality${rangeQuery(range)}`,
  /** GET — trend detection (§R11.7). */
  trends: (range: DateRange) => `/analytics/trends${rangeQuery(range)}`,
  /** GET — a period report; only the three documented values are reachable. */
  report: (period: ReportPeriod) => `/analytics/reports/${period}`,
} as const;
