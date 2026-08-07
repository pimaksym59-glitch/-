/**
 * The frozen §Personas calls, verbatim (API_SPEC "Personas / Actors /
 * Locations"). Entity-local on purpose: `shared/lib/api/endpoints` sits in
 * every route's commons, and memory-only bytes must not tax other routes
 * (plan §3.6; the FS7 `documentPaths` precedent).
 *
 * `POST /channels/{id}/personas` (create) exists in the contract but is OUT of
 * FS8 scope (channel setup — plan §8), so it is deliberately not built here.
 */
export const personaPaths = {
  list: (channelId: string) => `/channels/${encodeURIComponent(channelId)}/personas`,
  detail: (id: string) => `/personas/${encodeURIComponent(id)}`,
  update: (id: string) => `/personas/${encodeURIComponent(id)}`,
  archive: (id: string) => `/personas/${encodeURIComponent(id)}/archive`,
} as const;
