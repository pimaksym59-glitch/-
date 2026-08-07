/**
 * The frozen §Images calls, verbatim (API_SPEC "Images (§R6)"). Entity-local
 * (the FS7 `documentPaths` precedent — commons stay untouched, plan §3.6).
 *
 * The group carries **no create call**: there is no `POST /images`. Image
 * generation is the backend pipeline stage `generate_image` (§R2.5/§R13.2);
 * the only generation intent a client can express is regeneration of an
 * existing image (§R6.5, capped by `IMAGE_MAX_REGEN` server-side). The Studio
 * therefore never renders a composer that could not submit (plan §5.2 D1).
 */
export const imagePaths = {
  list: (channelId: string) => `/channels/${encodeURIComponent(channelId)}/images`,
  detail: (id: string) => `/images/${encodeURIComponent(id)}`,
  history: (id: string) => `/images/${encodeURIComponent(id)}/history`,
  similarity: (id: string) => `/images/${encodeURIComponent(id)}/similarity`,
  /** → 202 {task_id} (§R10.1 queue intent). */
  regenerate: (id: string) => `/images/${encodeURIComponent(id)}/regenerate`,
  /** → 204, soft delete (§R4.4). */
  remove: (id: string) => `/images/${encodeURIComponent(id)}`,
} as const;
