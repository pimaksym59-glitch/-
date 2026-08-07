/**
 * Query keys for the `location` entity — entity-local (FS9 T-FS9.1, the same
 * zero-commons rule as `entities/image/keys.ts`: `shared/config/query-keys.ts`
 * gains no rows this stage).
 */
export const locationKeys = {
  list: (channelId: string) => ['locations', 'list', channelId] as const,
} as const;
