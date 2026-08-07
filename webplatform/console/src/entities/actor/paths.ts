/**
 * The frozen §Actors calls, verbatim (API_SPEC "Personas / Actors /
 * Locations"). Entity-local (plan §3.6 — commons stay untouched).
 *
 * FS8 left `POST /actors/{id}/references` deliberately unwired (references are
 * a generation input, §R6.1). **FS9 wires it** — that upload is the Image
 * Studio's entry duty, and this one path string is the only FS9 edit to the
 * memory surface (FS9 plan §3.3, measured in the report).
 */
export const actorPaths = {
  list: (channelId: string) => `/channels/${encodeURIComponent(channelId)}/actors`,
  detail: (id: string) => `/actors/${encodeURIComponent(id)}`,
  /** Identity-conditioning references (§R6.1) — multipart *(assumed)*, FE-RV-12. */
  references: (id: string) => `/actors/${encodeURIComponent(id)}/references`,
} as const;
