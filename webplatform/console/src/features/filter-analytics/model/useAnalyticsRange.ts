'use client';

/**
 * The analytics view state, owned by the URL (FS11 T-FS11.6, plan §3.4/§3.5).
 *
 * `?from=` / `?to=` are the **contract's own** parameters (`GET
 * /analytics/channels/{id}?from=&to=`), so the URL is not a convenience here —
 * it is the query. Same for `?group_by=` (the `/cost` facet) and `?period=`
 * (the report). Each of those changes WHICH DATA IS FETCHED, so each writes
 * with `history: 'push'` and Back reverses it (the FS8 `?scope=` lesson,
 * applied preventively). `?panel=` is a pure view affordance and stays
 * `replace`.
 *
 * This feature owns no cache and no server state — it only reads and writes the
 * URL.
 */
import { useQueryState } from 'nuqs';
import { useEffect } from 'react';
import type { DateRange } from '@/entities/analytics-report';
import {
  COST_GROUP_BY,
  REPORT_PERIODS,
  type CostGroupBy,
  type ReportPeriod,
} from '@/entities/analytics-report';
import { DEFAULT_PRESET, isIsoDate, presetRange } from './range';

export interface AnalyticsViewState {
  readonly range: DateRange;
  readonly groupBy: CostGroupBy;
  readonly period: ReportPeriod;
  readonly panel: string | null;
  /** The browser day the presets are computed against (ISO, stable per mount). */
  readonly today: string;
  setRange: (next: DateRange) => void;
  setGroupBy: (next: CostGroupBy) => void;
  setPeriod: (next: ReportPeriod) => void;
  setPanel: (next: string | null) => void;
}

function coerceGroupBy(value: string | null): CostGroupBy {
  return COST_GROUP_BY.includes((value ?? '') as CostGroupBy) ? (value as CostGroupBy) : 'day';
}

function coercePeriod(value: string | null): ReportPeriod {
  return REPORT_PERIODS.includes((value ?? '') as ReportPeriod) ? (value as ReportPeriod) : 'daily';
}

export function useAnalyticsRange(today: string): AnalyticsViewState {
  // Data-changing keys PUSH; the view affordance REPLACEs (plan §3.5).
  const [from, setFrom] = useQueryState('from', { history: 'push' });
  const [to, setTo] = useQueryState('to', { history: 'push' });
  const [groupByRaw, setGroupBy] = useQueryState('group_by', { history: 'push' });
  const [periodRaw, setPeriod] = useQueryState('period', { history: 'push' });
  const [panel, setPanel] = useQueryState('panel');

  const resolved =
    isIsoDate(from) && isIsoDate(to) ? { from, to } : presetRange(DEFAULT_PRESET, today);

  // A shared link must be unambiguous, so the resolved default is written into
  // the URL once — with `replace`, because it is not a user navigation.
  useEffect(() => {
    if (isIsoDate(from) && isIsoDate(to)) return;
    void setFrom(resolved.from, { history: 'replace' });
    void setTo(resolved.to, { history: 'replace' });
  }, [from, to, resolved.from, resolved.to, setFrom, setTo]);

  return {
    range: resolved,
    groupBy: coerceGroupBy(groupByRaw),
    period: coercePeriod(periodRaw),
    panel,
    today,
    setRange: (next) => {
      void setFrom(next.from);
      void setTo(next.to);
    },
    setGroupBy: (next) => void setGroupBy(next === 'day' ? null : next),
    setPeriod: (next) => void setPeriod(next === 'daily' ? null : next),
    setPanel: (next) => void setPanel(next),
  };
}
