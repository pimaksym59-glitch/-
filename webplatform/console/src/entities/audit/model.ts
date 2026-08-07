/**
 * Entity `audit` — model (FS12, D3 §19). `audit_log` is the formal record of
 * who did what (§R10.8): `actor_user_id · action · entity · entity_id ·
 * before jsonb · after jsonb · created_at`.
 *
 * Two honesty rules carry the whole slice:
 *  1. **A null `before` is a CREATE**, and a null `after` is a DELETE — neither
 *     is padded into an empty object so the diff can look symmetrical.
 *  2. **An unrecognised key renders by its RAW name** (the FS8 `style_features`
 *     / FS11 panel discipline), so a wire change degrades into a visible row
 *     rather than silent data loss.
 *
 * The actor stays a raw id: `/users` is owner-only (API_SPEC matrix), so an
 * analyst reading the audit log cannot resolve names, and inventing one would
 * be a fabrication (the FS10 raw-author precedent).
 *
 * **Why the jsonb comparison is duplicated here** rather than shared with
 * `entities/config-version`: FSD forbids a cross-entity import, and the only
 * other home would be `shared/lib` — which sits in every route's commons, where
 * `/chat` has 1.0 kB of headroom. Twenty pure lines are cheaper than a commons
 * byte, and the two surfaces answer different domain questions (a record's
 * before→after vs two configuration snapshots). A deliberate, measured trade.
 */
import type { AuditRecordWireDTO } from '@/shared/types';

export type { AuditRecordWireDTO };

export type AuditChangeKind = 'created' | 'updated' | 'deleted' | 'unknown';

export interface AuditRecordVM {
  readonly id: string;
  readonly actorId: string | null;
  readonly action: string;
  readonly entity: string;
  readonly entityId: string | null;
  readonly before: Record<string, unknown> | null;
  readonly after: Record<string, unknown> | null;
  readonly createdAt: string | null;
  readonly changeKind: AuditChangeKind;
}

function classify(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): AuditChangeKind {
  if (before === null && after !== null) return 'created';
  if (before !== null && after === null) return 'deleted';
  if (before !== null && after !== null) return 'updated';
  return 'unknown';
}

export function mapAuditRecord(wire: AuditRecordWireDTO): AuditRecordVM {
  const before = wire.before ?? null;
  const after = wire.after ?? null;
  return {
    id: wire.id,
    actorId: wire.actor_user_id ?? null,
    action: wire.action,
    entity: wire.entity,
    entityId: wire.entity_id ?? null,
    before,
    after,
    createdAt: wire.created_at ?? null,
    changeKind: classify(before, after),
  };
}

/** Newest first. */
export function sortAuditRecords(records: readonly AuditRecordVM[]): readonly AuditRecordVM[] {
  return records.slice().sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}

export type AuditDiffKind = 'added' | 'removed' | 'changed' | 'unchanged';

export interface AuditDiffRow {
  readonly key: string;
  readonly before: string | null;
  readonly after: string | null;
  readonly kind: AuditDiffKind;
}

/** Stable, dependency-free rendering of a jsonb leaf. */
export function renderAuditValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * The before→after rows for one record: the union of both sides' keys, sorted,
 * so a removal is as visible as an addition. Nothing here computes, infers or
 * explains a change — it only shows what the two served payloads say.
 */
export function diffAuditRecord(record: AuditRecordVM): readonly AuditDiffRow[] {
  const a = record.before ?? {};
  const b = record.after ?? {};
  const keys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)])).sort();
  return keys.map((key) => {
    const inA = Object.prototype.hasOwnProperty.call(a, key);
    const inB = Object.prototype.hasOwnProperty.call(b, key);
    const before = inA ? renderAuditValue(a[key]) : null;
    const after = inB ? renderAuditValue(b[key]) : null;
    let kind: AuditDiffKind;
    if (!inA) kind = 'added';
    else if (!inB) kind = 'removed';
    else kind = before === after ? 'unchanged' : 'changed';
    return { key, before, after, kind };
  });
}

/** The distinct actors/entities present in a LOADED page — used to offer facet
 *  values honestly, since the contract exposes no facet-values endpoint. */
export function collectFacet(
  records: readonly AuditRecordVM[],
  facet: 'entity' | 'actor',
): readonly string[] {
  const seen = new Set<string>();
  for (const record of records) {
    const value = facet === 'entity' ? record.entity : record.actorId;
    if (value) seen.add(value);
  }
  return Array.from(seen).sort();
}
