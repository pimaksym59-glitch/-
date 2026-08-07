/**
 * CSV of the series the browser ALREADY holds (FS11 T-FS11.7, plan §5.2 D9).
 *
 * There is no export endpoint in the frozen contract and none is called: this
 * serializes exactly what is on screen, the same class of pure derivation as
 * FS10's `diffVersions`. Two rules make it honest:
 *
 * 1. **Gated series are excluded by construction.** A gated metric has no value
 *    to export, and emitting an empty column would imply data that does not
 *    exist (§R10.3). The caller is told which series were left out.
 * 2. **Nothing is computed.** No totals, no averages, no derived rates — only
 *    the served points, so the file cannot claim more than the API did.
 */
import type { SeriesVM } from '@/entities/analytics-report';

const escape = (value: string): string =>
  /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

export interface CsvResult {
  readonly csv: string;
  /** Labels of series omitted because they are gated (§R10.3). */
  readonly excluded: readonly string[];
  readonly rowCount: number;
}

export function toCsv(series: readonly SeriesVM[]): CsvResult {
  const usable = series.filter((entry) => !entry.gated);
  const excluded = series.filter((entry) => entry.gated).map((entry) => entry.label);

  const keys: string[] = [];
  for (const entry of usable) {
    for (const point of entry.points) if (!keys.includes(point.key)) keys.push(point.key);
  }

  const header = ['key', ...usable.map((entry) => escape(entry.label))].join(',');
  const rows = keys.map((key) => {
    const cells = usable.map((entry) => {
      const point = entry.points.find((candidate) => candidate.key === key);
      return point === undefined ? '' : String(point.value);
    });
    return [escape(key), ...cells].join(',');
  });

  return { csv: [header, ...rows].join('\n'), excluded, rowCount: keys.length };
}
