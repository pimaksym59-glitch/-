'use client';

/**
 * ThemeProvider (Stage 3 §7 #1 — OUTERMOST). Reads theme/density from the SSR
 * cookie (applied before paint, no FOUC) and exposes controls. Persists changes
 * to a cookie so the next SSR render is correct. Themes are equal-weight and
 * user-controlled (D2 intro / §F4.4).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  COOKIE_MAX_AGE,
  DENSITY_COOKIE,
  THEME_COOKIE,
  type Density,
  type Theme,
} from '@/shared/config/theme';

interface ThemeContextValue {
  readonly theme: Theme;
  readonly density: Density;
  readonly setTheme: (theme: Theme) => void;
  readonly setDensity: (density: Density) => void;
  readonly toggleTheme: () => void;
  readonly toggleDensity: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function writeCookie(name: string, value: string): void {
  document.cookie = `${name}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}

export interface ThemeProviderProps {
  readonly initialTheme: Theme;
  readonly initialDensity: Density;
  readonly children: React.ReactNode;
}

export function ThemeProvider({
  initialTheme,
  initialDensity,
  children,
}: ThemeProviderProps): React.ReactElement {
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [density, setDensityState] = useState<Density>(initialDensity);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset['theme'] = theme;
    root.dataset['density'] = density;
  }, [theme, density]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    writeCookie(THEME_COOKIE, next);
  }, []);

  const setDensity = useCallback((next: Density) => {
    setDensityState(next);
    writeCookie(DENSITY_COOKIE, next);
  }, []);

  const toggleTheme = useCallback(
    () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    [theme, setTheme],
  );
  const toggleDensity = useCallback(
    () => setDensity(density === 'comfortable' ? 'compact' : 'comfortable'),
    [density, setDensity],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, density, setTheme, setDensity, toggleTheme, toggleDensity }),
    [theme, density, setTheme, setDensity, toggleTheme, toggleDensity],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>.');
  return ctx;
}

export function useDensity(): Pick<ThemeContextValue, 'density' | 'setDensity' | 'toggleDensity'> {
  const { density, setDensity, toggleDensity } = useTheme();
  return { density, setDensity, toggleDensity };
}
