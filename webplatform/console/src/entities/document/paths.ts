/**
 * The seven frozen §R9.3 `/documents` calls, verbatim (API_SPEC §Knowledge
 * Base). Entity-local on purpose: `shared/lib/api/endpoints` sits in every
 * route's commons, and knowledge-only bytes must not tax other routes' First
 * Load (plan §6.3.6; FS5 precedent — entity-local paths).
 */
export const documentPaths = {
  list: (channelId?: string) =>
    channelId ? `/documents?channel_id=${encodeURIComponent(channelId)}` : '/documents',
  create: () => '/documents',
  detail: (id: string) => `/documents/${encodeURIComponent(id)}`,
  update: (id: string) => `/documents/${encodeURIComponent(id)}`,
  versions: (id: string) => `/documents/${encodeURIComponent(id)}/versions`,
  reindex: (id: string) => `/documents/${encodeURIComponent(id)}/reindex`,
  assign: (id: string) => `/documents/${encodeURIComponent(id)}/assign`,
} as const;
