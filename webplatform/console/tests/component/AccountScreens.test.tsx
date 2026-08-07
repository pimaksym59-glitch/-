/**
 * FS13 component tests — Settings and Profile.
 *
 * The emphasis is on what the stage promised rather than rendering trivia:
 *   - a preference that is REAL drives the shipped provider (theme/density),
 *   - a preference that is BROWSER-LOCAL says so wherever it is rendered,
 *   - Experience Level actually changes what is revealed (D6 — a control that
 *     changed nothing would be a fabricated capability),
 *   - `danger` toasts have no control at all (D5-B),
 *   - the activity tab is actor-scoped, permission-gated, and degrades to an
 *     honest absence rather than the platform-wide log,
 *   - and every absence names fact · reason · what would change it.
 */
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NuqsAdapter } from 'nuqs/adapters/react';
import { AccessibilityProvider, StreamingProvider } from '@/shared/providers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Role } from '@/shared/config/rbac';
import { __resetPreferencesCacheForTests } from '@/features/change-settings';
import { MUTED_TOASTS_COOKIE } from '@/shared/lib/notifications';
import type * as SharedHooks from '@/shared/hooks';
import { SettingsView } from '@/widgets/settings';
import { ProfileHonesty, ProfileView, toIdentity } from '@/widgets/profile';
import { ActivityPanel } from '@/widgets/profile/ActivityPanel';

/* ------------------------------------------------------------------ harness */

const state: { role: Role; permissions: readonly string[]; userId: string } = {
  role: 'owner',
  permissions: [],
  userId: 'usr_fixture_owner',
};

const theme = { theme: 'dark', density: 'comfortable', setTheme: vi.fn(), setDensity: vi.fn() };

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/shared/hooks', async (importOriginal) => {
  const mod = await importOriginal<typeof SharedHooks>();
  return {
    ...mod,
    useInspector: () => ({ target: null, isOpen: false, inspect, close: vi.fn() }),
  };
});
const inspect = vi.fn();

vi.mock('@/shared/providers', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/shared/providers');
  return {
    ...actual,
    useCan: () => (permission: string) => state.permissions.includes(permission),
    useToast: () => ({ toast: vi.fn() }),
    useSession: () => ({
      userId: state.userId,
      email: `${state.role}@console.local`,
      displayName: `Console ${state.role}`,
      role: state.role,
      mfaEnabled: false,
    }),
    useTheme: () => theme,
  };
});

const OWNER = [
  'workspace.view',
  'content.view',
  'content.edit',
  'content.publish',
  'analytics.view',
  'platform.view',
  'platform.manage',
  'admin.users.manage',
  'admin.providers.manage',
  'settings.manage',
];
const EDITOR = ['workspace.view', 'content.view', 'content.edit', 'settings.manage'];
const ANALYST = [
  'workspace.view',
  'content.view',
  'analytics.view',
  'platform.view',
  'settings.manage',
];

function asRole(role: Role, permissions: readonly string[], userId = 'usr_fixture_owner'): void {
  state.role = role;
  state.permissions = permissions;
  state.userId = userId;
}

function renderView(ui: React.ReactElement): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  render(
    <QueryClientProvider client={client}>
      <NuqsAdapter>
        <AccessibilityProvider>
          <StreamingProvider>{ui}</StreamingProvider>
        </AccessibilityProvider>
      </NuqsAdapter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  document.cookie = `${MUTED_TOASTS_COOKIE}=; path=/; max-age=0`;
  __resetPreferencesCacheForTests();
  asRole('owner', OWNER);
  theme.setTheme.mockClear();
  theme.setDensity.mockClear();
});

/* ------------------------------------------------------------------ settings */

describe('Settings — Appearance is the one preference that was already real', () => {
  it('drives the shipped ThemeProvider rather than a local copy', async () => {
    const user = userEvent.setup();
    renderView(<SettingsView section="appearance" />);
    await user.click(screen.getByRole('radio', { name: 'Light' }));
    expect(theme.setTheme).toHaveBeenCalledWith('light');
  });

  it('changes density through the same provider', async () => {
    const user = userEvent.setup();
    renderView(<SettingsView section="appearance" />);
    await user.click(screen.getByRole('radio', { name: 'Compact' }));
    expect(theme.setDensity).toHaveBeenCalledWith('compact');
  });

  it('states that the preference lives in this browser, not the account', () => {
    renderView(<SettingsView section="appearance" />);
    expect(screen.getByText(/stored in cookies in this browser/i)).toBeInTheDocument();
    expect(screen.getByText(/do not follow you to another browser or device/i)).toBeInTheDocument();
  });

  it('offers no accent picker and says why', () => {
    renderView(<SettingsView section="appearance" />);
    expect(screen.getByText(/Accent colour is not selectable/i)).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /accent/i })).not.toBeInTheDocument();
  });

  it('renders exactly one h1 and section headings at h2', () => {
    renderView(<SettingsView section="appearance" />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 2, name: 'Appearance' })).toBeInTheDocument();
  });
});

describe('Settings — Experience level is CONSUMED, not merely stored (D6)', () => {
  it('reveals detail that Beginner hides', async () => {
    const user = userEvent.setup();
    renderView(<SettingsView section="experience" />);

    // Beginner (the default): the appearance note carries no cookie names.
    expect(screen.queryByText(/onyx-theme/)).not.toBeInTheDocument();

    await user.click(await screen.findByRole('radio', { name: 'Advanced' }));
    // The level itself now describes what it reveals — a real behavioural delta.
    expect(
      await screen.findByText(/Storage keys, cookie names and the raw preference payload/i),
    ).toBeInTheDocument();
  });

  it('shows the raw stored payload only from Advanced upward', async () => {
    const user = userEvent.setup();

    // Beginner (default): no payload dump.
    renderView(<SettingsView section="advanced" />);
    expect(await screen.findByText(/Reset preferences/i)).toBeInTheDocument();
    expect(screen.queryByText(/"experience"/)).not.toBeInTheDocument();
    cleanup();

    // Raise the level, then re-open Advanced — each render gets its own DOM so
    // the assertion cannot match a leftover panel.
    renderView(<SettingsView section="experience" />);
    await user.click(await screen.findByRole('radio', { name: 'Power' }));
    cleanup();

    renderView(<SettingsView section="advanced" />);
    expect(await screen.findByText(/"experience"/)).toBeInTheDocument();
  });

  it('names the screens that respond to the level today, rather than promising all', async () => {
    renderView(<SettingsView section="experience" />);
    expect(
      await screen.findByText(/Settings and Profile respond to this level today/i),
    ).toBeInTheDocument();
  });
});

describe('Settings — notification preferences (D5-B)', () => {
  it('offers a switch for each mutable kind', async () => {
    renderView(<SettingsView section="notifications" />);
    for (const label of [
      /success toasts/i,
      /information toasts/i,
      /warning toasts/i,
      /ai toasts/i,
    ]) {
      expect(await screen.findByRole('switch', { name: label })).toBeInTheDocument();
    }
  });

  it('gives ERROR toasts no control at all, and says they are always shown', async () => {
    renderView(<SettingsView section="notifications" />);
    expect(await screen.findByText('Always shown')).toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: /error/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: /danger/i })).not.toBeInTheDocument();
  });

  it('muting a kind writes the cookie the emitter reads', async () => {
    const user = userEvent.setup();
    renderView(<SettingsView section="notifications" />);
    await user.click(await screen.findByRole('switch', { name: /information toasts/i }));
    expect(decodeURIComponent(document.cookie)).toContain('info');
  });

  it('states that this governs toasts, not delivery', async () => {
    renderView(<SettingsView section="notifications" />);
    expect(await screen.findByText(/They are not a delivery setting/i)).toBeInTheDocument();
    expect(
      screen.getByText(/There is no notification centre and no per-kind delivery/i),
    ).toBeInTheDocument();
  });
});

describe('Settings — Account and Security are absences, stated', () => {
  it('renders identity read-only with no edit affordance', async () => {
    renderView(<SettingsView section="account" />);
    expect(await screen.findByText('owner@console.local')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.getByText(/You cannot edit your profile here/i)).toBeInTheDocument();
    expect(screen.getByText(/There is no password change/i)).toBeInTheDocument();
  });

  it('renders no password field anywhere', async () => {
    const { container } = render(
      <QueryClientProvider client={new QueryClient()}>
        <NuqsAdapter>
          <SettingsView section="account" />
        </NuqsAdapter>
      </QueryClientProvider>,
    );

    await screen.findByText(/There is no password change/i);
    expect(container.querySelector('input[type="password"]')).toBeNull();
  });

  it('reports no MFA state, because off and unreported are indistinguishable', async () => {
    renderView(<SettingsView section="security" />);
    const mfa = await screen.findByText(/Multi-factor authentication is not configurable here/i);
    expect(mfa).toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: /mfa/i })).not.toBeInTheDocument();
    expect(screen.getByText(/cannot tell 'MFA is off' apart from/i)).toBeInTheDocument();
  });

  it('cross-links the owner to Admin instead of duplicating the revoke (D4-A)', async () => {
    renderView(<SettingsView section="security" />);
    const link = await screen.findByRole('link', { name: /Open Admin → Sessions/i });
    expect(link).toHaveAttribute('href', '/admin?tab=sessions');
    expect(
      screen.queryByRole('button', { name: /sign out other sessions/i }),
    ).not.toBeInTheDocument();
  });

  it('tells a non-owner the action is owner-only rather than showing a dead control', async () => {
    asRole('editor', EDITOR);
    renderView(<SettingsView section="security" />);
    expect(await screen.findByText(/Sign out other sessions is owner-only/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Open Admin → Sessions/i })).not.toBeInTheDocument();
  });

  it('points channel parameters at the screen that owns them', async () => {
    renderView(<SettingsView section="advanced" />);
    expect(
      await screen.findByText(/Channel and pipeline parameters are not here/i),
    ).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------- profile */

describe('Profile — identity and the sessions absence', () => {
  it('renders identity from the session with no edit affordance', () => {
    renderView(<ProfileView sessionsSlot={<ProfileHonesty />} />);
    expect(screen.getByRole('heading', { level: 1, name: /Console owner/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit profile/i })).not.toBeInTheDocument();
  });

  it('explains why sessions cannot be listed and links somewhere real', () => {
    render(<ProfileHonesty />);
    expect(screen.getByText(/Your sessions cannot be listed/i)).toBeInTheDocument();
    // The links are the a11y fix, not decoration (FS12 scrollable-region lesson).
    const nav = screen.getByRole('navigation', { name: /where to look instead/i });
    expect(within(nav).getAllByRole('link').length).toBeGreaterThan(0);
  });

  it('falls back to the email for a display name, because there is no name column', () => {
    expect(
      toIdentity({
        userId: 'u1',
        email: 'a@b.c',
        displayName: 'a@b.c',
        role: 'viewer',
        mfaEnabled: false,
      })?.displayName,
    ).toBe('a@b.c');
  });

  it('treats a blank user id as absent rather than as a filter value', () => {
    expect(
      toIdentity({
        userId: '',
        email: 'a@b.c',
        displayName: 'a@b.c',
        role: 'viewer',
        mfaEnabled: false,
      })?.userId,
    ).toBeNull();
  });
});

/* ------------------------------------------------------------------ activity */

describe('Profile — the activity tab is the stage’s one real read', () => {
  it('shows a permission state INSIDE the screen for a role the matrix excludes', async () => {
    asRole('editor', EDITOR);
    renderView(<ActivityPanel />);
    expect(
      await screen.findByText(/Your role cannot read the activity record/i),
    ).toBeInTheDocument();
    // A permission state, never a crash and never an empty list pretending.
    expect(screen.queryByRole('list', { name: /your recent activity/i })).not.toBeInTheDocument();
  });

  it('renders only the signed-in user’s own records', async () => {
    asRole('owner', OWNER, 'usr_fixture_owner');
    renderView(<ActivityPanel />);
    const list = await screen.findByRole('list', { name: /your recent activity/i });
    expect(within(list).getByText('prompt.version_created')).toBeInTheDocument();
    expect(within(list).getByText('channel.paused')).toBeInTheDocument();
    // FS12's platform-wide rows belong to other actors and must NOT appear.
    expect(within(list).queryByText('api_key.rotated')).not.toBeInTheDocument();
    expect(within(list).queryByText('document.deleted')).not.toBeInTheDocument();
  });

  it('shows an honest empty state for a permitted user with no records', async () => {
    asRole(
      'admin',
      OWNER.filter((p) => !p.startsWith('admin.')),
      'usr_fixture_admin',
    );
    renderView(<ActivityPanel />);
    expect(await screen.findByText('No recent activity.')).toBeInTheDocument();
  });

  it('renders an absence — never the platform-wide log — when there is no user id', async () => {
    asRole('owner', OWNER, '');
    renderView(<ActivityPanel />);
    expect(await screen.findByText(/cannot be scoped to you/i)).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: /your recent activity/i })).not.toBeInTheDocument();
  });

  it('offers the AI summary only to a role that also holds content.edit', async () => {
    asRole('analyst', ANALYST, 'usr_fixture_analyst');
    renderView(<ActivityPanel />);
    await screen.findByRole('list', { name: /your recent activity/i });
    expect(screen.queryByRole('button', { name: /summarize with ai/i })).not.toBeInTheDocument();
  });

  it('never auto-runs the AI summary', async () => {
    const user = userEvent.setup();
    asRole('owner', OWNER, 'usr_fixture_owner');
    renderView(<ActivityPanel />);
    await screen.findByRole('list', { name: /your recent activity/i });
    expect(screen.queryByTestId('explain-activity-output')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /summarize with ai/i }));
    expect(await screen.findByRole('button', { name: /summarize activity/i })).toBeInTheDocument();
    // Opening the panel is not running it.
    expect(screen.queryByTestId('explain-activity-output')).not.toBeInTheDocument();
  });

  it('opens FS12’s audit Inspector rather than registering a new type (D9)', async () => {
    const user = userEvent.setup();
    asRole('owner', OWNER, 'usr_fixture_owner');
    renderView(<ActivityPanel />);
    const list = await screen.findByRole('list', { name: /your recent activity/i });
    await user.click(within(list).getByRole('button', { name: 'channel.paused' }));
    expect(inspect).toHaveBeenCalledWith({ type: 'audit', id: 'aud_self_2' });
  });
});
