/**
 * FS11 T-FS11.11 — range maths (`features/filter-analytics`).
 *
 * Pure by construction: "today" is an argument, never a clock read, so these
 * assertions are deterministic and the app has exactly one place where a real
 * date enters (the RSC page). `date-fns` stays deferred.
 */
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PRESET,
  describeRange,
  isIsoDate,
  matchPreset,
  presetRange,
  RANGE_PRESETS,
  shiftRange,
} from '@/features/filter-analytics';

const TODAY = '2026-08-03';

describe('presets are inclusive whole-day windows', () => {
  it('computes each documented preset', () => {
    expect(presetRange('7d', TODAY)).toEqual({ from: '2026-07-28', to: TODAY });
    expect(presetRange('30d', TODAY)).toEqual({ from: '2026-07-05', to: TODAY });
    expect(presetRange('90d', TODAY)).toEqual({ from: '2026-05-06', to: TODAY });
  });

  it('round-trips through matchPreset', () => {
    for (const preset of RANGE_PRESETS) {
      expect(matchPreset(presetRange(preset, TODAY), TODAY)).toBe(preset);
    }
    expect(matchPreset({ from: '2026-01-01', to: '2026-01-09' }, TODAY)).toBeNull();
  });

  it('defaults to the 30-day window', () => {
    expect(DEFAULT_PRESET).toBe('30d');
  });
});

describe('shifting moves the window by its own length', () => {
  it('steps back and forward without changing the span', () => {
    const week = presetRange('7d', TODAY);
    const back = shiftRange(week, -1);
    expect(back).toEqual({ from: '2026-07-21', to: '2026-07-27' });
    expect(shiftRange(back, 1)).toEqual(week);
  });

  it('leaves an incomplete range untouched rather than guessing', () => {
    expect(shiftRange({ from: null, to: '2026-08-03' }, 1)).toEqual({
      from: null,
      to: '2026-08-03',
    });
  });
});

describe('range parsing and description', () => {
  it('accepts only ISO dates', () => {
    expect(isIsoDate('2026-08-03')).toBe(true);
    expect(isIsoDate('03-08-2026')).toBe(false);
    expect(isIsoDate(null)).toBe(false);
    expect(isIsoDate('')).toBe(false);
  });

  it('describes an absent range as absent', () => {
    expect(describeRange({ from: '2026-07-05', to: '2026-08-03' })).toBe('2026-07-05 → 2026-08-03');
    expect(describeRange({ from: null, to: null })).toBe('no range');
  });
});
