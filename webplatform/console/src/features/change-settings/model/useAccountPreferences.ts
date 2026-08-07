'use client';

/**
 * The React face of `preferences.ts`. Components read and write preferences
 * ONLY through this hook — they never see `localStorage`, never see the persist
 * primitive and never hold a second copy of the value (plan §3.4: nothing is
 * owned by TanStack Query *and* Zustand, and a preference is owned by neither
 * — it is local, browser-scoped state with one module behind it).
 */
import { useCallback, useSyncExternalStore } from 'react';
import {
  getPreferences,
  getServerPreferences,
  resetPreferences,
  subscribePreferences,
  writePreferences,
  type AccountPreferences,
  type ExperienceLevel,
  type MutableToastKind,
} from './preferences';

export interface AccountPreferencesApi {
  readonly preferences: AccountPreferences;
  readonly setExperience: (level: ExperienceLevel) => void;
  readonly setToastKindMuted: (kind: MutableToastKind, muted: boolean) => void;
  readonly reset: () => void;
}

export function useAccountPreferences(): AccountPreferencesApi {
  const preferences = useSyncExternalStore(
    subscribePreferences,
    getPreferences,
    getServerPreferences,
  );

  const setExperience = useCallback((level: ExperienceLevel) => {
    writePreferences({ experience: level });
  }, []);

  const setToastKindMuted = useCallback((kind: MutableToastKind, muted: boolean) => {
    const current = getPreferences().mutedToastKinds;
    const next = muted ? [...current, kind] : current.filter((k) => k !== kind);
    writePreferences({ mutedToastKinds: next });
  }, []);

  const reset = useCallback(() => {
    resetPreferences();
  }, []);

  return { preferences, setExperience, setToastKindMuted, reset };
}
