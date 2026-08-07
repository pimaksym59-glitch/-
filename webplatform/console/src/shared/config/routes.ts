/**
 * Central route registry (Stage 3 §5 — 25 screens across four route groups).
 * Single source for navigation, middleware protection, and RBAC reflection.
 * FS1 wires every route as a stub; business screens arrive in FS5+.
 */
import type { Permission } from './rbac';

export type RouteGroup = 'public' | 'workspace' | 'platform' | 'account';

export interface RouteDef {
  readonly path: string;
  readonly label: string;
  readonly group: RouteGroup;
  /** lucide-react icon name (D2 §10). */
  readonly icon: string;
  /** Permission required to see/enter (UI reflection only; enforced server-side). */
  readonly permission?: Permission;
  /** Whether the route appears in the sidebar. */
  readonly nav: boolean;
}

export const ROUTES = {
  // (public)
  landing: { path: '/', label: 'Home', group: 'public', icon: 'sparkles', nav: false },
  login: { path: '/login', label: 'Sign in', group: 'public', icon: 'log-in', nav: false },
  register: {
    path: '/register',
    label: 'Register',
    group: 'public',
    icon: 'user-plus',
    nav: false,
  },
  // (workspace)
  dashboard: {
    path: '/dashboard',
    label: 'Dashboard',
    group: 'workspace',
    icon: 'layout-dashboard',
    permission: 'workspace.view',
    nav: true,
  },
  chat: {
    path: '/chat',
    label: 'AI Chat',
    group: 'workspace',
    icon: 'message-square',
    permission: 'content.edit',
    nav: true,
  },
  knowledge: {
    path: '/knowledge',
    label: 'Knowledge',
    group: 'workspace',
    icon: 'book-open',
    // FS7 PATCH: D3 §7 + §R10.5 give analyst/viewer READ («ро») — the route
    // opens on `content.view`; every write/AI affordance gates on
    // `content.edit` at the call site (SEC-7).
    permission: 'content.view',
    nav: true,
  },
  memory: {
    path: '/memory',
    label: 'Memory',
    group: 'workspace',
    icon: 'brain',
    // FS8 PATCH (the FS7 knowledge precedent): D3 §8 + §R10.5 give
    // analyst/viewer READ on Personas/Actors («ро») — the route opens on
    // `content.view`; every write/AI affordance gates on `content.edit`.
    permission: 'content.view',
    nav: true,
  },
  studio: {
    path: '/studio',
    label: 'Image Studio',
    group: 'workspace',
    icon: 'image',
    // FS9 PATCH (the FS7/FS8 precedent): D3 §9 gives Analyst/Viewer READ of the
    // image workspace — the route opens on `content.view`; every write intent
    // (regenerate, delete, reference upload) and the AI panel gate on
    // `content.edit` at the call site (SEC-7). The backend stays the boundary.
    permission: 'content.view',
    nav: true,
  },
  prompts: {
    path: '/prompts',
    label: 'Prompt Library',
    group: 'workspace',
    icon: 'library',
    // FS10 PATCH (the FS7/FS8/FS9 precedent): D3 §10 gives Analyst/Viewer READ,
    // and the API_SPEC RBAC matrix row "Personas/Actors/KB/Prompts" is «ро» for
    // both — the route opens on `content.view`; the only write the contract has
    // (POST /prompts = a new version) and the AI panel gate on `content.edit`
    // at the call site (SEC-7). The backend stays the boundary.
    permission: 'content.view',
    nav: true,
  },
  playground: {
    path: '/playground',
    label: 'Playground',
    group: 'workspace',
    icon: 'flask-conical',
    permission: 'content.edit',
    nav: true,
  },
  analytics: {
    path: '/analytics',
    label: 'Analytics',
    group: 'workspace',
    icon: 'chart-line',
    permission: 'analytics.view',
    nav: true,
  },
  channels: {
    path: '/channels',
    label: 'Channels',
    group: 'workspace',
    icon: 'radio',
    permission: 'content.view',
    nav: true,
  },
  // (platform)
  admin: {
    path: '/admin',
    label: 'Admin',
    group: 'platform',
    icon: 'shield',
    permission: 'platform.manage',
    nav: true,
  },
  providers: {
    path: '/providers',
    label: 'Providers',
    group: 'platform',
    icon: 'plug',
    // FS12 PATCH (plan §5.2 D11): D3 §15 is explicit — "Owner manage keys;
    // Admin read; others hidden" — and the API_SPEC matrix scopes API keys to
    // owner alone. The route opens on `platform.manage` (owner + admin) and
    // the ROTATION affordance gates on `admin.providers.manage` (owner) at the
    // call site (SEC-7). The backend stays the boundary.
    permission: 'platform.manage',
    nav: true,
  },
  health: {
    path: '/health',
    label: 'Health',
    group: 'platform',
    icon: 'heart-pulse',
    permission: 'platform.view',
    nav: true,
  },
  jobs: {
    path: '/jobs',
    label: 'Jobs',
    group: 'platform',
    icon: 'list-checks',
    // FS12 PATCH (plan §5.2 D10): API_SPEC scopes the whole "Scheduler & Tasks
    // (§R8; owner/admin)" group to owner/admin, and its matrix row gives
    // cancel/requeue/run to those two only. D3 §17 additionally offers Analyst
    // and Viewer read — the CONTRACT WINS, so the route opens on
    // `platform.manage` and every intent gates on the same permission.
    permission: 'platform.manage',
    nav: true,
  },
  logs: {
    path: '/logs',
    label: 'Logs',
    group: 'platform',
    icon: 'scroll-text',
    permission: 'platform.view',
    nav: true,
  },
  audit: {
    path: '/audit',
    label: 'Audit',
    group: 'platform',
    icon: 'file-clock',
    permission: 'platform.view',
    nav: true,
  },
  flags: {
    path: '/flags',
    label: 'Feature Flags',
    group: 'platform',
    icon: 'toggle-right',
    permission: 'platform.manage',
    nav: true,
  },
  billing: {
    path: '/billing',
    label: 'Billing',
    group: 'platform',
    icon: 'wallet',
    permission: 'platform.view',
    nav: true,
  },
  notifications: {
    path: '/notifications',
    label: 'Notifications',
    group: 'platform',
    icon: 'bell',
    permission: 'workspace.view',
    nav: true,
  },
  // (account)
  settings: {
    path: '/settings',
    label: 'Settings',
    group: 'account',
    icon: 'settings',
    permission: 'settings.manage',
    nav: true,
  },
  profile: {
    path: '/profile',
    label: 'Profile',
    group: 'account',
    icon: 'user',
    permission: 'settings.manage',
    nav: true,
  },
  docs: { path: '/docs', label: 'Docs', group: 'account', icon: 'file-text', nav: true },
} as const satisfies Record<string, RouteDef>;

export type RouteKey = keyof typeof ROUTES;

export const ROUTE_LIST: readonly RouteDef[] = Object.values(ROUTES);

/** Route groups that require an authenticated session (Stage 3 §5 middleware). */
export const PROTECTED_GROUPS: readonly RouteGroup[] = ['workspace', 'platform', 'account'];

/** Public path prefixes that never require a session (docs are public, §5).
 * `/403` is public so the permission state can render without a redirect loop. */
const PUBLIC_PREFIXES = ['/', '/login', '/register', '/docs', '/403'] as const;

export function isPublicPath(pathname: string): boolean {
  if (pathname === '/') return true;
  return PUBLIC_PREFIXES.some((p) => p !== '/' && (pathname === p || pathname.startsWith(`${p}/`)));
}

export function isProtectedPath(pathname: string): boolean {
  return !isPublicPath(pathname);
}
