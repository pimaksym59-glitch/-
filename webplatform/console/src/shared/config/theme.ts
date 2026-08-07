/**
 * Theme + density contract (D2 §4 / §F4.4). Server-safe (no client imports) so
 * the root layout can read the cookie during SSR and hand the initial values
 * to ThemeProvider — flipping tokens before paint (no FOUC).
 */
export type Theme = 'dark' | 'light';
export type Density = 'comfortable' | 'compact';

export const THEME_COOKIE = 'onyx-theme';
export const DENSITY_COOKIE = 'onyx-density';

/** Dark-first (D2 intro). */
export const DEFAULT_THEME: Theme = 'dark';
export const DEFAULT_DENSITY: Density = 'comfortable';

export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export function parseTheme(value: string | undefined): Theme {
  return value === 'light' || value === 'dark' ? value : DEFAULT_THEME;
}

export function parseDensity(value: string | undefined): Density {
  return value === 'compact' || value === 'comfortable' ? value : DEFAULT_DENSITY;
}
