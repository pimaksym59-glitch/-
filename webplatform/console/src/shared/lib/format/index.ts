/**
 * Formatting utilities (Stage 3 §1 shared/lib/format): dates, numbers (tabular),
 * bytes, cost. Locale-ready via Intl; deterministic for tests.
 */
const numberFmt = new Intl.NumberFormat('en-US');

export function formatNumber(value: number): string {
  return numberFmt.format(value);
}

export function formatCost(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), BYTE_UNITS.length - 1);
  const value = bytes / 1024 ** exponent;
  const unit = BYTE_UNITS[exponent] ?? 'B';
  return `${value.toFixed(value < 10 && exponent > 0 ? 1 : 0)} ${unit}`;
}

export function formatDate(input: Date | string | number): string {
  const date = input instanceof Date ? input : new Date(input);
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

const RELATIVE_FMT = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' });
const RELATIVE_STEPS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 60 * 60 * 24 * 365],
  ['month', 60 * 60 * 24 * 30],
  ['day', 60 * 60 * 24],
  ['hour', 60 * 60],
  ['minute', 60],
  ['second', 1],
];

export function formatRelativeTime(input: Date | string | number, now: Date = new Date()): string {
  const date = input instanceof Date ? input : new Date(input);
  const deltaSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
  for (const [unit, secondsInUnit] of RELATIVE_STEPS) {
    if (Math.abs(deltaSeconds) >= secondsInUnit || unit === 'second') {
      return RELATIVE_FMT.format(Math.round(deltaSeconds / secondsInUnit), unit);
    }
  }
  return RELATIVE_FMT.format(0, 'second');
}
