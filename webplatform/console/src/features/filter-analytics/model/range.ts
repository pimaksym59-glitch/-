/**
 * Range maths for the analytics filter (FS11 T-FS11.6).
 *
 * PURE by construction: every function takes "today" as an argument instead of
 * reading a clock, so it is deterministic in tests and the only place a real
 * date enters the app is the hook that calls it. `date-fns` stays deferred —
 * ISO date strings and `Date.UTC` are enough for whole-day windows, and adding
 * a dependency for this would be the wrong trade (plan §8).
 */
import type { DateRange } from '@/entities/analytics-report';

export const RANGE_PRESETS = ['7d', '30d', '90d'] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number];

export const PRESET_LABEL: Readonly<Record<RangePreset, string>> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
};

const PRESET_DAYS: Readonly<Record<RangePreset, number>> = { '7d': 6, '30d': 29, '90d': 89 };

/** The default view when the URL carries no range. */
export const DEFAULT_PRESET: RangePreset = '30d';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string | null | undefined): value is string {
  return typeof value === 'string' && ISO_DATE.test(value);
}

/** `today` and `days` → an inclusive whole-day window in ISO dates. */
export function presetRange(preset: RangePreset, today: string): DateRange {
  const end = new Date(`${today}T00:00:00Z`);
  const start = new Date(end.getTime() - PRESET_DAYS[preset] * 86_400_000);
  return { from: start.toISOString().slice(0, 10), to: today };
}

/** Which preset (if any) a range corresponds to — drives the pressed state. */
export function matchPreset(range: DateRange, today: string): RangePreset | null {
  for (const preset of RANGE_PRESETS) {
    const candidate = presetRange(preset, today);
    if (candidate.from === range.from && candidate.to === range.to) return preset;
  }
  return null;
}

/** Shift a window by its own length — the `[` / `]` previous/next period keys. */
export function shiftRange(range: DateRange, direction: -1 | 1): DateRange {
  if (!isIsoDate(range.from) || !isIsoDate(range.to)) return range;
  const from = new Date(`${range.from}T00:00:00Z`).getTime();
  const to = new Date(`${range.to}T00:00:00Z`).getTime();
  const span = to - from + 86_400_000;
  return {
    from: new Date(from + direction * span).toISOString().slice(0, 10),
    to: new Date(to + direction * span).toISOString().slice(0, 10),
  };
}

/** A human sentence for the provenance whisper and the export description. */
export function describeRange(range: DateRange): string {
  if (isIsoDate(range.from) && isIsoDate(range.to)) return `${range.from} → ${range.to}`;
  return 'no range';
}
