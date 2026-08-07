/** Public API — entity `platform-user` (FS12 Admin §R10.5). */
export {
  mapPlatformUser,
  parseRole,
  sortUsers,
  countOwners,
  ROLE_LABELS,
  type PlatformUserVM,
  type PlatformUserWireDTO,
} from './model';
export { fetchPlatformUsers, usePlatformUsers, PLATFORM_USER_STALE_MS } from './hooks';
export { platformUserPaths } from './paths';
export { platformUserKeys } from './keys';
