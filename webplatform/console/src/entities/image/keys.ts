/**
 * Query keys for the `image` entity — **entity-local by design** (FS9 T-FS9.1).
 *
 * The FS7 precedent kept knowledge-only endpoint paths out of the shared
 * `endpoints.ts` because that module sits in every route's commons; FS8 split
 * the keyboard registry by concern for the same reason. FS9 extends the rule
 * one layer up: `/chat` has **1.0 kB** of First-Load headroom and the
 * commons-offload lever is spent, so image-only key builders live HERE and
 * `shared/config/query-keys.ts` gains **zero rows** (plan §3.1/§3.2).
 *
 * Namespace discipline: image keys always start with `'images'`, so they can
 * never collide with `posts` / `documents` / `personas` / `actors` — locked by
 * `tests/unit/studio-commons.test.ts`.
 */
export const imageKeys = {
  list: (channelId: string) => ['images', 'list', channelId] as const,
  detail: (id: string) => ['images', 'detail', id] as const,
  /** Every generation attempt (§R6.5). */
  history: (id: string) => ['images', 'history', id] as const,
  /** The phash / scene / CLIP report (§R6.4). */
  similarity: (id: string) => ['images', 'similarity', id] as const,
} as const;
