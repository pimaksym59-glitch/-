/**
 * Entity `config-version` — model (FS12, D3 §14). `config_versions` is one half
 * of what makes governance auditable at all (§R10.8): `id · author ·
 * description · snapshot jsonb · created_at`.
 *
 * **The diff is a pure derivation over two SERVED snapshots**, exactly as FS10
 * derived a prompt diff from two served texts — there is no diff endpoint and
 * none is called. If the list does not carry `snapshot` (FE-RV-15), `canDiff`
 * is false and the UI says so instead of comparing nothing.
 */
import type { ConfigVersionWireDTO } from '@/shared/types';

export type { ConfigVersionWireDTO };

export interface ConfigVersionVM {
  readonly id: string;
  readonly author: string | null;
  readonly description: string | null;
  readonly createdAt: string | null;
  /** The served jsonb, untouched. Null when the wire omits it. */
  readonly snapshot: Record<string, unknown> | null;
  /** Whether this row carries enough to participate in a comparison. */
  readonly hasSnapshot: boolean;
}

export function mapConfigVersion(wire: ConfigVersionWireDTO): ConfigVersionVM {
  const snapshot = wire.snapshot ?? null;
  return {
    id: wire.id,
    author: wire.author ?? null,
    description: wire.description ?? null,
    createdAt: wire.created_at ?? null,
    snapshot,
    hasSnapshot: snapshot !== null && typeof snapshot === 'object',
  };
}

/** Newest first — the history reads top-down like every other timeline. */
export function sortConfigVersions(
  versions: readonly ConfigVersionVM[],
): readonly ConfigVersionVM[] {
  return versions.slice().sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}

export type ConfigDiffKind = 'added' | 'removed' | 'changed' | 'unchanged';

export interface ConfigDiffRow {
  readonly key: string;
  readonly before: string | null;
  readonly after: string | null;
  readonly kind: ConfigDiffKind;
}

/** Stable, dependency-free rendering of a jsonb leaf. Objects/arrays are shown
 *  as compact JSON so a nested change is visible rather than "[object]". */
export function renderValue(value: unknown): string {
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
 * A pure, dependency-free comparison of two snapshots. Keys are the union of
 * both sides, sorted, so a removal is as visible as an addition — and an
 * unrecognised key is compared by its RAW name, never dropped (the FS8/FS11
 * discipline). Nothing here computes, infers or explains a change; it only
 * shows what the two served payloads say.
 */
export function diffSnapshots(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): readonly ConfigDiffRow[] {
  const a = before ?? {};
  const b = after ?? {};
  const keys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)])).sort();
  return keys.map((key) => {
    const inA = Object.prototype.hasOwnProperty.call(a, key);
    const inB = Object.prototype.hasOwnProperty.call(b, key);
    const left = inA ? renderValue(a[key]) : null;
    const right = inB ? renderValue(b[key]) : null;
    let kind: ConfigDiffKind;
    if (!inA) kind = 'added';
    else if (!inB) kind = 'removed';
    else kind = left === right ? 'unchanged' : 'changed';
    return { key, before: left, after: right, kind };
  });
}

export function countChanges(rows: readonly ConfigDiffRow[]): number {
  return rows.filter((r) => r.kind !== 'unchanged').length;
}
