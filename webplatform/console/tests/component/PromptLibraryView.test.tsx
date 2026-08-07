/**
 * PromptLibraryView integration (FS10 T-FS10.5/T-FS10.11): RSC initial data →
 * hydrated list, per-role rendering, the honest absences that replace what the
 * contract cannot back (activation, variables, delete), `j/k` navigation, the
 * contract's own `?type=` facet, and the canonical D2 §15 empty state.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as SharedHooks from '@/shared/hooks';
import { groupPromptsByType, mapPrompt } from '@/entities/prompt';
import type { Role } from '@/shared/config/rbac';
import { PROMPTS, resetFixturePromptState } from '@/shared/lib/fixtures/dataset';
import { useUiStore } from '@/shared/lib/store';
import {
  AccessibilityProvider,
  AuthProvider,
  NotificationProvider,
  StreamingProvider,
} from '@/shared/providers';
import type { SessionDTO } from '@/shared/types';
import { PromptLibraryView, type PromptsInitial } from '@/widgets/prompts';

const push = vi.fn();
const inspect = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock('nuqs', () => ({
  useQueryState: () => [null, vi.fn()],
}));

vi.mock('@/shared/hooks', async (importOriginal) => {
  const mod = await importOriginal<typeof SharedHooks>();
  return {
    ...mod,
    useInspector: () => ({ target: null, isOpen: false, inspect, close: vi.fn() }),
  };
});

const GROUPS = groupPromptsByType(PROMPTS.map(mapPrompt));
const INITIAL: PromptsInitial = { groups: GROUPS };

function sessionFor(role: Role): SessionDTO {
  return {
    userId: `usr_${role}`,
    email: `${role}@console.local`,
    displayName: `Console ${role}`,
    role,
    mfaEnabled: false,
  };
}

function renderLibrary(
  role: Role,
  initial: PromptsInitial = INITIAL,
  type: string | null = null,
  version: number | null = null,
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider session={sessionFor(role)}>
        <AccessibilityProvider>
          <NotificationProvider>
            <StreamingProvider>
              <PromptLibraryView initial={initial} type={type} version={version} />
            </StreamingProvider>
          </NotificationProvider>
        </AccessibilityProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  push.mockClear();
  inspect.mockClear();
  resetFixturePromptState();
  useUiStore.setState({ activeChannelId: 'ch_tech', hydrated: true });
});

describe('PromptLibraryView (FS10 T-FS10.5)', () => {
  it('renders the library grouped by prompt TYPE from initial data', () => {
    renderLibrary('editor');
    expect(screen.getByRole('heading', { level: 1, name: 'Prompt Library' })).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Prompt types' });
    expect(within(list).getByRole('button', { name: 'Open prompt System' })).toBeInTheDocument();
    expect(within(list).getByRole('button', { name: 'Open prompt Image' })).toBeInTheDocument();
    // The chain length is real data, not a guess.
    expect(within(list).getByText('3 versions')).toBeInTheDocument();
  });

  it('never renders an Active or Draft badge — the contract has no activation state', () => {
    renderLibrary('editor');
    expect(screen.queryByText('Active')).not.toBeInTheDocument();
    expect(screen.queryByText('Draft')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Promote to active/ })).not.toBeInTheDocument();
  });

  it('never renders a variables count — no such field exists', () => {
    renderLibrary('editor');
    expect(screen.queryByText(/\d+ variables?/)).not.toBeInTheDocument();
    expect(screen.queryByText(/insert variable/i)).not.toBeInTheDocument();
  });

  it('offers no delete or rename affordance anywhere', () => {
    renderLibrary('editor');
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /rename/i })).not.toBeInTheDocument();
  });

  it('surfaces an UNRECOGNISED prompt type by its raw value', () => {
    renderLibrary('editor');
    expect(screen.getByText(/unrecognised type “weekly_digest”/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open prompt weekly_digest' })).toBeInTheDocument();
  });

  it('states the platform-wide truth (prompts are not channel-scoped)', () => {
    renderLibrary('editor');
    expect(
      screen.getAllByRole('heading', { name: 'Prompts are platform-wide, not per-channel' }).length,
    ).toBeGreaterThan(0);
  });

  it('an editor gets the ONE write the contract has; a viewer gets an honest read-only line', () => {
    const { unmount } = renderLibrary('editor');
    expect(screen.getAllByRole('button', { name: 'New version' }).length).toBeGreaterThan(0);
    unmount();

    renderLibrary('viewer');
    expect(screen.queryByRole('button', { name: 'New version' })).not.toBeInTheDocument();
    expect(
      screen.getByText('Your role reads this library — authoring versions is an editor operation.'),
    ).toBeInTheDocument();
  });

  it('`j` moves focus down the list of prompt types', async () => {
    const user = userEvent.setup();
    renderLibrary('editor');
    const first = screen.getByRole('button', { name: 'Open prompt System' });
    first.focus();
    await user.keyboard('j');
    expect(screen.getByRole('button', { name: 'Open prompt Image' })).toHaveFocus();
    await user.keyboard('k');
    expect(first).toHaveFocus();
  });

  it('opening a type is a route navigation (the §3.5 URL contract)', async () => {
    const user = userEvent.setup();
    renderLibrary('editor');
    await user.click(screen.getByRole('button', { name: 'Open prompt System' }));
    expect(push).toHaveBeenCalledWith('/prompts/system');
  });

  it('the Inspector affordance uses the FS2 ?inspect= contract with the version row id', async () => {
    const user = userEvent.setup();
    renderLibrary('editor');
    await user.click(screen.getByRole('button', { name: 'Inspect prompt version prm_system_3' }));
    expect(inspect).toHaveBeenCalledWith({ type: 'prompt', id: 'prm_system_3' });
  });

  it('exposes the contract’s own ?type= facet, distinct from the text filter', () => {
    renderLibrary('editor');
    const facet = screen.getByRole('group', { name: 'Filter by prompt type' });
    expect(within(facet).getByRole('button', { name: 'All types' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(facet).getByRole('button', { name: 'System' })).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Filter by type, text or recorded model/),
    ).toBeInTheDocument();
  });

  it('renders the D2 §15 empty state when the library is empty', () => {
    renderLibrary('editor', { groups: [] });
    expect(screen.getByRole('heading', { name: 'No prompts yet' })).toBeInTheDocument();
    expect(screen.getByText(/an edit is always a new version/i)).toBeInTheDocument();
  });

  it('a failed server fetch never renders as an empty library', () => {
    renderLibrary('editor', { groups: null });
    // No initial data ⇒ the island fetches; it must not claim "no prompts yet".
    expect(screen.queryByRole('heading', { name: 'No prompts yet' })).not.toBeInTheDocument();
  });
});

describe('PromptDetail (lazy) — the version chain', () => {
  it('shows the selected version, its metadata and the honest absences', async () => {
    renderLibrary('editor', INITIAL, 'system', 2);

    expect(await screen.findByRole('heading', { name: /System\s*v2/ })).toBeInTheDocument();
    // The stored text, verbatim.
    expect(screen.getByText(/Vary structure, opening and closing between posts\./)).toBeVisible();
    // Author is an id, never a fabricated name.
    expect(screen.getByText('usr_owner')).toBeInTheDocument();
    expect(screen.getByText('Model recorded on the row')).toBeInTheDocument();
    // The two seams this pane must always carry.
    expect(
      screen.getByRole('heading', { name: 'Which version is “active” is decided in the backend' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'No variables are claimed, because none are defined' }),
    ).toBeInTheDocument();
  });

  it('offers a comparison against the previous version only when one exists', async () => {
    renderLibrary('editor', INITIAL, 'system', 1);
    expect(await screen.findByRole('heading', { name: /System\s*v1/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Compare with/ })).not.toBeInTheDocument();

    renderLibrary('editor', INITIAL, 'system', 3);
    expect(await screen.findByRole('button', { name: 'Compare with v2' })).toBeInTheDocument();
  });

  it('a read-only role sees no composer and no test panel', async () => {
    renderLibrary('viewer', INITIAL, 'system', 3);
    expect(await screen.findByRole('heading', { name: /System\s*v3/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New version' })).not.toBeInTheDocument();
    expect(screen.getByText('Testing a version is an editor operation.')).toBeInTheDocument();
  });
});
