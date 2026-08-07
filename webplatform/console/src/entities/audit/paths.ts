/**
 * The frozen audit call, verbatim:
 *   GET /audit-log?entity=&actor=      (§R10.8)
 *
 * Those two are the ONLY documented filters. D3 §19 also asks for a time range
 * and an export; the contract carries neither, so no `from`/`to` is ever sent
 * and no export path exists here (plan §5.2 D8). Audit is immutable — there is
 * no write path and there never will be one.
 */
export const auditPaths = {
  list: (entity?: string | null, actor?: string | null) => {
    const params = new URLSearchParams();
    if (entity) params.set('entity', entity);
    if (actor) params.set('actor', actor);
    const query = params.toString();
    return query === '' ? '/audit-log' : `/audit-log?${query}`;
  },
} as const;
