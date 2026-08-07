/** Public API — entity `config-version` (FS12 Admin §R10.8). */
export {
  mapConfigVersion,
  sortConfigVersions,
  diffSnapshots,
  countChanges,
  renderValue,
  type ConfigVersionVM,
  type ConfigDiffRow,
  type ConfigDiffKind,
  type ConfigVersionWireDTO,
} from './model';
export { fetchConfigVersions, useConfigVersions, CONFIG_VERSION_STALE_MS } from './hooks';
export { configVersionPaths } from './paths';
export { configVersionKeys } from './keys';
