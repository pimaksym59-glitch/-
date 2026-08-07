/**
 * Query keys for the `prompt` entity — **entity-local by design** (FS10
 * T-FS10.1, the FS9 mechanism now the default).
 *
 * `/chat` sits at **178 / 180 kB** with 2.0 kB of headroom that webpack's
 * re-partition returned rather than a lever won, and the FS8 commons-offload
 * lever is spent. Prompt-only key builders therefore live HERE and
 * `shared/config/query-keys.ts` gains **zero rows** (plan §3.1/§3.2).
 *
 * **Channel-free by construction (the owner's requirement A).** Every other
 * workspace entity keys by channel because its records carry a `channel_id`;
 * the `prompts` table does not (DATABASE_SPEC §prompts), so the Prompt Library
 * is the project's first platform-wide surface. No builder here accepts a
 * channel id, which is what makes "switching channels changes nothing on this
 * screen" a structural fact rather than a behaviour to remember.
 *
 * Namespace discipline: prompt keys always start with `'prompts'`, so they can
 * never collide with `posts` / `documents` / `personas` / `actors` / `images` /
 * `locations` — all of it locked by `tests/unit/prompts-commons.test.ts`.
 */
export const promptKeys = {
  /** The whole library (every version row the contract returns). */
  list: () => ['prompts', 'list'] as const,
  /** The contract's own `?type=` narrowing. */
  byType: (type: string) => ['prompts', 'list', type] as const,
  /** The version chain of one row. */
  versions: (id: string) => ['prompts', 'versions', id] as const,
} as const;
