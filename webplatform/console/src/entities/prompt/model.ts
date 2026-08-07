/**
 * Entity `prompt` — model (Stage 3 §4, FS10 Prompt Library §R10.6). The wire is
 * *(assumed)* pending FE-RV-13; THESE mappers are the single adjustment point.
 *
 * Five disciplines are load-bearing here:
 *  1. **Identity is `type`, not a name.** The record has no `name` column and
 *     `?type=` is the only filter the contract accepts, so the library groups
 *     by type. An unrecognised type is rendered by its **raw value** (the
 *     `parseStatus` / `style_features` discipline), never dropped or renamed.
 *  2. **No activation exists.** There is no promote endpoint and no
 *     `is_active` column, so no ViewModel field claims one and no Active/Draft
 *     badge can be rendered from this data (plan §5.2 D2).
 *  3. **No variables.** No wire field, no documented templating syntax; §R5.3
 *     says the BACKEND prompt-builder assembles the runtime prompt from persona
 *     + rules + topic + few-shot. Nothing here counts, detects or highlights a
 *     "variable" (plan §5.2 D5).
 *  4. **The author stays an id.** `author` is a `uuid FK→users` and the
 *     `/users` group is owner-only, so the console shows the id it was given
 *     and never fetches or invents a person's name.
 *  5. **No channel.** The table has no `channel_id`; nothing in this module
 *     accepts or derives one (owner requirement A).
 *
 * `diffVersions` is a pure derivation of two texts the contract already serves
 * — the console computes it, the backend is never asked and never claimed to
 * have an opinion about it (plan §5.2 D7).
 */
import type { PromptWireDTO } from '@/shared/types';

export type { PromptWireDTO };

export interface PromptVersionVM {
  readonly id: string;
  /** The raw wire value — preserved even when unrecognised. */
  readonly type: string;
  /** Humanised label when the type is known; the raw value otherwise. */
  readonly typeLabel: string;
  readonly typeKnown: boolean;
  readonly text: string;
  readonly version: number;
  /** The raw `author` uuid — never resolved to a name (§R10.5 owner-only). */
  readonly authorId: string | null;
  /** Recorded by the backend on the row; absent on many rows. */
  readonly model: string | null;
  /** Recorded by the backend on the row; absent on many rows. */
  readonly result: string | null;
  readonly createdAt: string | null;
}

export interface PromptGroupVM {
  readonly type: string;
  readonly label: string;
  readonly known: boolean;
  /** Newest version first. */
  readonly versions: readonly PromptVersionVM[];
  readonly latest: PromptVersionVM;
  readonly versionCount: number;
}

/**
 * The `prompt_type` enum (DATABASE_SPEC §enums). Used for LABELS and ordering
 * only — never as a filter on what the wire may return: an unknown value is
 * displayed, not discarded.
 */
export const PROMPT_TYPE_LABELS: Readonly<Record<string, string>> = {
  system: 'System',
  image: 'Image',
  negative: 'Negative',
  sales: 'Sales',
  story: 'Story',
  morning: 'Morning',
  evening: 'Evening',
  other: 'Other',
};

const TYPE_ORDER: readonly string[] = [
  'system',
  'image',
  'negative',
  'sales',
  'story',
  'morning',
  'evening',
  'other',
];

export function promptTypeLabel(type: string): string {
  return PROMPT_TYPE_LABELS[type] ?? type;
}

export function mapPrompt(wire: PromptWireDTO): PromptVersionVM {
  const type = wire.type;
  const known = Object.prototype.hasOwnProperty.call(PROMPT_TYPE_LABELS, type);
  return {
    id: wire.id,
    type,
    typeLabel: known ? (PROMPT_TYPE_LABELS[type] ?? type) : type,
    typeKnown: known,
    text: wire.text,
    version: wire.version,
    authorId: wire.author ?? null,
    model: wire.model ?? null,
    result: wire.result ?? null,
    createdAt: wire.created_at ?? null,
  };
}

/** Newest first: highest `version`, ties broken by `created_at`. */
export function sortVersions(versions: readonly PromptVersionVM[]): readonly PromptVersionVM[] {
  return [...versions].sort((a, b) => {
    if (a.version !== b.version) return b.version - a.version;
    if (a.createdAt === b.createdAt) return 0;
    if (a.createdAt === null) return 1;
    if (b.createdAt === null) return -1;
    return a.createdAt < b.createdAt ? 1 : -1;
  });
}

/**
 * Rows → prompt types → version chains. Known types keep the enum order;
 * unknown types follow, alphabetically, so a wire surprise is visible rather
 * than buried.
 */
export function groupPromptsByType(rows: readonly PromptVersionVM[]): readonly PromptGroupVM[] {
  const buckets = new Map<string, PromptVersionVM[]>();
  for (const row of rows) {
    const bucket = buckets.get(row.type);
    if (bucket) bucket.push(row);
    else buckets.set(row.type, [row]);
  }

  const groups: PromptGroupVM[] = [];
  for (const [type, bucket] of buckets) {
    const versions = sortVersions(bucket);
    const latest = versions[0];
    if (!latest) continue;
    groups.push({
      type,
      label: latest.typeLabel,
      known: latest.typeKnown,
      versions,
      latest,
      versionCount: versions.length,
    });
  }

  return groups.sort((a, b) => {
    const ai = TYPE_ORDER.indexOf(a.type);
    const bi = TYPE_ORDER.indexOf(b.type);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.type < b.type ? -1 : a.type > b.type ? 1 : 0;
  });
}

export function findGroup(
  groups: readonly PromptGroupVM[],
  type: string | null,
): PromptGroupVM | null {
  if (type === null) return null;
  return groups.find((group) => group.type === type) ?? null;
}

export function findVersion(
  group: PromptGroupVM | null,
  version: number | null,
): PromptVersionVM | null {
  if (!group) return null;
  if (version === null) return group.latest;
  return group.versions.find((entry) => entry.version === version) ?? null;
}

/** The version immediately below `version` in the chain (its diff partner). */
export function previousVersion(group: PromptGroupVM, version: number): PromptVersionVM | null {
  const index = group.versions.findIndex((entry) => entry.version === version);
  if (index === -1) return null;
  return group.versions[index + 1] ?? null;
}

/**
 * Client-side LIST filtering (type label, text or recorded model contains) —
 * presentation only, honestly distinct from any backend search. The contract's
 * own `?type=` filter is a separate, server-side facet (plan §3.5).
 */
export function filterPromptGroups(
  groups: readonly PromptGroupVM[],
  query: string,
): readonly PromptGroupVM[] {
  const q = query.trim().toLowerCase();
  if (q === '') return groups;
  return groups.filter(
    (group) =>
      group.label.toLowerCase().includes(q) ||
      group.type.toLowerCase().includes(q) ||
      group.versions.some(
        (version) =>
          version.text.toLowerCase().includes(q) || (version.model ?? '').toLowerCase().includes(q),
      ),
  );
}

export interface PromptDiffVM {
  /** Unified-style text: `+` added, `-` removed, leading space unchanged. */
  readonly text: string;
  readonly added: number;
  readonly removed: number;
  readonly identical: boolean;
  /** True when the texts were too long for a line-by-line comparison. */
  readonly coarse: boolean;
}

/** Above this, a line-by-line LCS is replaced by an honest block comparison. */
const DIFF_LINE_CAP = 600;

/**
 * A pure line diff between two version texts (Stage 3 §4 names this utility).
 * No dependency, no endpoint: the contract serves both texts and the
 * comparison is a derivation of what the user is already looking at.
 */
export function diffVersions(before: string, after: string): PromptDiffVM {
  const a = before.split('\n');
  const b = after.split('\n');

  if (before === after) {
    return {
      text: a.map((line) => ` ${line}`).join('\n'),
      added: 0,
      removed: 0,
      identical: true,
      coarse: false,
    };
  }

  if (a.length > DIFF_LINE_CAP || b.length > DIFF_LINE_CAP) {
    const text = [...a.map((line) => `-${line}`), ...b.map((line) => `+${line}`)].join('\n');
    return { text, added: b.length, removed: a.length, identical: false, coarse: true };
  }

  // Longest common subsequence over lines (DP table of line counts).
  const rows = a.length + 1;
  const cols = b.length + 1;
  const lcs: number[] = new Array<number>(rows * cols).fill(0);
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      lcs[i * cols + j] =
        a[i] === b[j]
          ? (lcs[(i + 1) * cols + (j + 1)] ?? 0) + 1
          : Math.max(lcs[(i + 1) * cols + j] ?? 0, lcs[i * cols + (j + 1)] ?? 0);
    }
  }

  const out: string[] = [];
  let added = 0;
  let removed = 0;
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push(` ${a[i] ?? ''}`);
      i += 1;
      j += 1;
    } else if ((lcs[(i + 1) * cols + j] ?? 0) >= (lcs[i * cols + (j + 1)] ?? 0)) {
      out.push(`-${a[i] ?? ''}`);
      removed += 1;
      i += 1;
    } else {
      out.push(`+${b[j] ?? ''}`);
      added += 1;
      j += 1;
    }
  }
  while (i < a.length) {
    out.push(`-${a[i] ?? ''}`);
    removed += 1;
    i += 1;
  }
  while (j < b.length) {
    out.push(`+${b[j] ?? ''}`);
    added += 1;
    j += 1;
  }

  return { text: out.join('\n'), added, removed, identical: false, coarse: false };
}
