/**
 * Audit export (FS12 T-FS12.9) — a PURE projection of records ALREADY LOADED in
 * the browser. The contract has **no export endpoint** (plan §5.2 D8), so this
 * calls nothing: what you can export is exactly what you can see.
 *
 * It computes nothing. No totals, no derived columns, no reformatting of a
 * value the wire gave — the jsonb payloads are serialized verbatim so the file
 * says the same thing the screen does. (The FS11 `toCsv` precedent; the ~15
 * duplicated lines of escaping are the deliberate, measured alternative to
 * putting a helper in commons, where `/chat` has 1.0 kB of headroom.)
 */
import type { AuditRecordVM } from '@/entities/audit';

const COLUMNS = ['id', 'created_at', 'actor', 'action', 'entity', 'entity_id', 'before', 'after'];

/** RFC-4180 escaping: quote everything that could confuse a spreadsheet. */
function cell(value: string): string {
  const needsQuotes = /[",\n\r]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function payload(value: Record<string, unknown> | null): string {
  if (value === null) return '';
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

export function toCsv(records: readonly AuditRecordVM[]): string {
  const rows = records.map((record) =>
    [
      record.id,
      record.createdAt ?? '',
      record.actorId ?? '',
      record.action,
      record.entity,
      record.entityId ?? '',
      payload(record.before),
      payload(record.after),
    ]
      .map(cell)
      .join(','),
  );
  return [COLUMNS.join(','), ...rows].join('\n');
}

/** The filename states the filters the rows were loaded under, so an exported
 *  slice can never be mistaken for the whole log. */
export function csvFilename(entity: string | null, actor: string | null): string {
  const scope = [entity ? `entity-${entity}` : null, actor ? `actor-${actor}` : null]
    .filter((part): part is string => part !== null)
    .join('_');
  return scope === '' ? 'audit-log.csv' : `audit-log_${scope}.csv`;
}
