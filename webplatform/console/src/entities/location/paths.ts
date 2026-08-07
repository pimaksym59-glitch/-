/**
 * The frozen §Locations calls, verbatim (API_SPEC "Personas / Actors /
 * Locations"). Entity-local (plan §3.6 — commons stay untouched).
 *
 * Only the channel-scoped LIST is used in FS9: locations are a generation
 * input (§R6.3) the backend picks from, and managing them is channel setup —
 * out of this stage's scope (plan §8).
 */
export const locationPaths = {
  list: (channelId: string) => `/channels/${encodeURIComponent(channelId)}/locations`,
} as const;
