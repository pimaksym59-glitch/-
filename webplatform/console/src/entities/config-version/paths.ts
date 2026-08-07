/**
 * The frozen §Users & Security config calls, verbatim:
 *   GET  /config-versions                  the snapshot history (§R10.8)
 *   POST /config-versions/{id}/rollback    restore a snapshot (§R10.8)
 *
 * There is no `GET /config-versions/{id}` and **no diff endpoint** — comparison
 * is a pure client-side derivation over two SERVED snapshots (the FS10
 * `diffVersions` precedent, plan §5.2 D7).
 */
export const configVersionPaths = {
  list: () => '/config-versions',
  rollback: (id: string) => `/config-versions/${encodeURIComponent(id)}/rollback`,
} as const;
