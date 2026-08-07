'use client';

/**
 * Global UI store (Stage 2 §7 / FE-ADR-5). Zustand owns **UI state only** —
 * sidebar shape, active channel, palette recents. It never holds server state
 * (TanStack Query), URL state (nuqs), session (AuthProvider) or streaming.
 *
 * Deliberately a module-level store with no React provider: Stage 3 §7 freezes
 * the seven-provider tree, and Zustand needs no provider. SSR correctness comes
 * from the root layout stamping `data-sidebar` from the cookie (same mechanism
 * as theme/density), with `hydrate()` seeding the store on mount.
 */
import { create } from 'zustand';
import {
  CHANNEL_COOKIE,
  DEFAULT_SIDEBAR,
  SIDEBAR_COOKIE,
  type SidebarState,
} from '@/shared/config/shell';
import { COOKIE_MAX_AGE } from '@/shared/config/theme';

const MAX_RECENTS = 5;

interface UiState {
  readonly sidebar: SidebarState;
  readonly activeChannelId: string | null;
  readonly recentCommands: readonly string[];
  readonly hydrated: boolean;
  setSidebar: (state: SidebarState) => void;
  toggleSidebar: () => void;
  setActiveChannel: (id: string | null) => void;
  pushRecent: (commandId: string) => void;
  hydrate: (initial: { sidebar: SidebarState; activeChannelId: string | null }) => void;
}

function writeCookie(name: string, value: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}

function applySidebarAttribute(state: SidebarState): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset['sidebar'] = state;
}

export const useUiStore = create<UiState>((set, get) => ({
  sidebar: DEFAULT_SIDEBAR,
  activeChannelId: null,
  recentCommands: [],
  hydrated: false,

  setSidebar: (state) => {
    set({ sidebar: state });
    writeCookie(SIDEBAR_COOKIE, state);
    applySidebarAttribute(state);
  },

  toggleSidebar: () => {
    get().setSidebar(get().sidebar === 'expanded' ? 'rail' : 'expanded');
  },

  setActiveChannel: (id) => {
    set({ activeChannelId: id });
    if (id) writeCookie(CHANNEL_COOKIE, id);
  },

  pushRecent: (commandId) => {
    set((prev) => ({
      recentCommands: [commandId, ...prev.recentCommands.filter((c) => c !== commandId)].slice(
        0,
        MAX_RECENTS,
      ),
    }));
  },

  hydrate: (initial) => {
    if (get().hydrated) return;
    set({ sidebar: initial.sidebar, activeChannelId: initial.activeChannelId, hydrated: true });
  },
}));

/** Selector helpers (kept small so components subscribe narrowly). */
export const selectSidebar = (s: UiState): SidebarState => s.sidebar;
export const selectActiveChannel = (s: UiState): string | null => s.activeChannelId;
export const selectRecents = (s: UiState): readonly string[] => s.recentCommands;
