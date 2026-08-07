'use client';

/**
 * ShortcutProvider (Stage 3 §7 #5). Owns the global keyboard map (D1 §6.5) and
 * the open-state of the palette, channel switcher and shortcut cheat-sheet.
 * Depends on Theme (⌘⇧L/⌘⇧D) and on the UI store (⌘\ sidebar rail).
 *
 * All handled ids live in `shared/config/shortcuts.ts` so the `⌘/` cheat-sheet
 * is generated from the same registry that drives behaviour.
 */
import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { G_CHORDS, isTextEntryTarget } from '@/shared/config/shortcuts';
import { ROUTES } from '@/shared/config/routes';
import { useUiStore } from '@/shared/lib/store/ui-store';
import { useTheme } from './ThemeProvider';

interface ShortcutContextValue {
  readonly paletteOpen: boolean;
  readonly openPalette: () => void;
  /** FS7 additive: open pre-seeded with an input value (e.g. `#` — D1 §6.7
   * topbar search entry). Same responsibility (palette open state); the
   * provider tree/order is untouched. */
  readonly openPaletteWith: (value: string) => void;
  readonly paletteInitialValue: string | null;
  readonly closePalette: () => void;
  readonly togglePalette: () => void;
  readonly switcherOpen: boolean;
  readonly setSwitcherOpen: (open: boolean) => void;
  readonly cheatsheetOpen: boolean;
  readonly setCheatsheetOpen: (open: boolean) => void;
}

const ShortcutContext = createContext<ShortcutContextValue | null>(null);

/** Window during which a `g` press is treated as the start of a chord. */
const CHORD_WINDOW_MS = 1200;

export function ShortcutProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false);
  const chordArmedAt = useRef<number | null>(null);

  const { toggleTheme, toggleDensity } = useTheme();
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const router = useRouter();

  const [paletteInitialValue, setPaletteInitialValue] = useState<string | null>(null);

  const openPalette = useCallback(() => {
    setPaletteInitialValue(null);
    setPaletteOpen(true);
  }, []);
  const openPaletteWith = useCallback((value: string) => {
    setPaletteInitialValue(value);
    setPaletteOpen(true);
  }, []);
  const closePalette = useCallback(() => {
    setPaletteInitialValue(null);
    setPaletteOpen(false);
  }, []);
  const togglePalette = useCallback(() => {
    setPaletteInitialValue(null);
    setPaletteOpen((v) => !v);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const key = event.key.toLowerCase();
      const mod = event.metaKey || event.ctrlKey;

      if (mod) {
        if (key === 'k') {
          event.preventDefault();
          togglePalette();
        } else if (key === '.') {
          event.preventDefault();
          setSwitcherOpen((v) => !v);
        } else if (key === '/') {
          event.preventDefault();
          setCheatsheetOpen((v) => !v);
        } else if (key === '\\') {
          event.preventDefault();
          toggleSidebar();
        } else if (key === ',') {
          // FS13 D10: `⌘,` → Settings (D3 §23 entry point). This branch is the
          // stage's ONLY commons edit and shipped only because T-FS13.1
          // measured it against `/chat` 180/180 and `/memory` 150.
          event.preventDefault();
          router.push(ROUTES.settings.path);
        } else if (event.shiftKey && key === 'l') {
          event.preventDefault();
          toggleTheme();
        } else if (event.shiftKey && key === 'd') {
          event.preventDefault();
          toggleDensity();
        }
        return;
      }

      // Un-modified keys must never hijack text entry (FS1 postmortem: guards).
      if (isTextEntryTarget(event.target) || event.altKey) return;

      const now = Date.now();
      const armed = chordArmedAt.current !== null && now - chordArmedAt.current < CHORD_WINDOW_MS;

      if (armed) {
        chordArmedAt.current = null;
        const routeKey = G_CHORDS[key];
        if (routeKey) {
          event.preventDefault();
          router.push(ROUTES[routeKey].path);
        }
        return;
      }

      if (key === 'g') {
        chordArmedAt.current = now;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [togglePalette, toggleSidebar, toggleTheme, toggleDensity, router]);

  const value = useMemo<ShortcutContextValue>(
    () => ({
      paletteOpen,
      openPalette,
      openPaletteWith,
      paletteInitialValue,
      closePalette,
      togglePalette,
      switcherOpen,
      setSwitcherOpen,
      cheatsheetOpen,
      setCheatsheetOpen,
    }),
    [
      paletteOpen,
      openPalette,
      openPaletteWith,
      paletteInitialValue,
      closePalette,
      togglePalette,
      switcherOpen,
      cheatsheetOpen,
    ],
  );

  return <ShortcutContext.Provider value={value}>{children}</ShortcutContext.Provider>;
}

export function useShortcuts(): ShortcutContextValue {
  const ctx = useContext(ShortcutContext);
  if (!ctx) throw new Error('useShortcuts must be used within <ShortcutProvider>.');
  return ctx;
}

export function useCommandPalette(): ShortcutContextValue {
  return useShortcuts();
}
