'use client';

/**
 * The analytics filter bar (FS11 T-FS11.6 — D3 §12 "filter bar (time range,
 * channel)").
 *
 * The **channel** half is deliberately absent: the topbar ChannelSwitcher has
 * owned the active channel since FS5 and re-scopes every channel-keyed query.
 * A second picker here would be a second source of truth for the same state
 * (plan §5.2 D1).
 *
 * Every control writes the URL, so the whole view is shareable and reversible
 * by Back (plan §3.5).
 */
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { DateRange } from '@/entities/analytics-report';
import { Input } from '@/shared/ui/input';
import {
  matchPreset,
  presetRange,
  RANGE_PRESETS,
  PRESET_LABEL,
  shiftRange,
  type RangePreset,
} from '../model/range';

export function RangeControls({
  range,
  today,
  onChange,
}: {
  readonly range: DateRange;
  readonly today: string;
  readonly onChange: (next: DateRange) => void;
}): React.ReactElement {
  const active: RangePreset | null = matchPreset(range, today);

  return (
    <section aria-label="Time range" className="flex flex-wrap items-end gap-x-4 gap-y-3">
      <div role="group" aria-label="Range presets" className="flex flex-wrap gap-2">
        {RANGE_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-pressed={active === preset}
            onClick={() => onChange(presetRange(preset, today))}
            className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
              active === preset
                ? 'bg-interactive-subtle text-primary'
                : 'text-secondary hover:bg-interactive-subtle hover:text-primary'
            }`}
          >
            {PRESET_LABEL[preset]}
          </button>
        ))}
      </div>

      <div className="flex items-end gap-2">
        <Input
          label="From"
          type="date"
          value={range.from ?? ''}
          max={range.to ?? undefined}
          onChange={(event) => onChange({ from: event.target.value || null, to: range.to })}
          containerClassName="w-40"
        />
        <Input
          label="To"
          type="date"
          value={range.to ?? ''}
          min={range.from ?? undefined}
          onChange={(event) => onChange({ from: range.from, to: event.target.value || null })}
          containerClassName="w-40"
        />
      </div>

      <div role="group" aria-label="Shift period" className="flex gap-1 pb-0.5">
        <button
          type="button"
          aria-label="Previous period"
          onClick={() => onChange(shiftRange(range, -1))}
          className="rounded-md p-2 text-secondary transition-colors hover:bg-interactive-subtle hover:text-primary"
        >
          <ChevronLeft aria-hidden className="size-4" strokeWidth={1.5} />
        </button>
        <button
          type="button"
          aria-label="Next period"
          onClick={() => onChange(shiftRange(range, 1))}
          className="rounded-md p-2 text-secondary transition-colors hover:bg-interactive-subtle hover:text-primary"
        >
          <ChevronRight aria-hidden className="size-4" strokeWidth={1.5} />
        </button>
      </div>
    </section>
  );
}
