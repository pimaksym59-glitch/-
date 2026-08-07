/**
 * Shell state contract (D1 §6.2 / §6.8). Server-safe (no client imports) so the
 * root layout can read the cookies during SSR and stamp the attributes before
 * paint — the same no-FOUC mechanism used for theme/density.
 */
export type SidebarState = 'expanded' | 'rail';

export const SIDEBAR_COOKIE = 'onyx-sidebar';
export const CHANNEL_COOKIE = 'onyx-channel';

export const DEFAULT_SIDEBAR: SidebarState = 'expanded';

export function parseSidebar(value: string | undefined): SidebarState {
  return value === 'rail' || value === 'expanded' ? value : DEFAULT_SIDEBAR;
}

/** URL contract for the Universal Inspector (D4 / Stage 3 §5): `?inspect=type:id`. */
export const INSPECT_PARAM = 'inspect';

export interface InspectTarget {
  readonly type: string;
  readonly id: string;
}

export function parseInspect(value: string | null | undefined): InspectTarget | null {
  if (!value) return null;
  const separator = value.indexOf(':');
  if (separator <= 0 || separator === value.length - 1) return null;
  return { type: value.slice(0, separator), id: value.slice(separator + 1) };
}

export function formatInspect(target: InspectTarget): string {
  return `${target.type}:${target.id}`;
}
