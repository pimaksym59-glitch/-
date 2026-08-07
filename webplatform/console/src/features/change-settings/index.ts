/**
 * Public API — feature `change-settings` (Stage 3 §3). Owns the account
 * preferences that live in this browser, and NOTHING that the API could own:
 * there is no preferences endpoint, so this slice has no query, no mutation and
 * no server state at all (plan §3.2, lock-tested).
 */
export {
  DEFAULT_PREFERENCES,
  EXPERIENCE_LEVELS,
  MUTABLE_TOAST_KINDS,
  PREFERENCES_STORAGE_KEY,
  getPreferences,
  readPreferences,
  resetPreferences,
  sanitize,
  subscribePreferences,
  writePreferences,
  __resetPreferencesCacheForTests,
  type AccountPreferences,
  type ExperienceLevel,
  type MutableToastKind,
} from './model/preferences';
export { useAccountPreferences, type AccountPreferencesApi } from './model/useAccountPreferences';
