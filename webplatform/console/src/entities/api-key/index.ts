/** Public API — entity `api-key` (FS12 Providers §R10.4/§R12.2, write-only). */
export {
  mapApiKeySlot,
  sortApiKeySlots,
  countConfigured,
  type ApiKeySlotVM,
  type ApiKeySlotWireDTO,
} from './model';
export { fetchApiKeySlots, useApiKeySlots, API_KEY_STALE_MS } from './hooks';
export { apiKeyPaths } from './paths';
export { apiKeyKeys } from './keys';
