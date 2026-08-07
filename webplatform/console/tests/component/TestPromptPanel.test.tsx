/**
 * TestPromptPanel (FS10 T-FS10.8/T-FS10.11) — the owner-approved D8 surface.
 * The tests hold its boundaries: nothing auto-runs, the output is never saved,
 * there is no refine and no compare, Trust/provenance/cost come from the wire,
 * and confidence stays honestly absent.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as SharedHooks from '@/shared/hooks';
import { mapPrompt } from '@/entities/prompt';
import { TestPromptPanel } from '@/features/test-prompt';
import type { Role } from '@/shared/config/rbac';
import { useAssistantStore } from '@/shared/lib/stream';
import {
  AccessibilityProvider,
  AuthProvider,
  NotificationProvider,
  StreamingProvider,
} from '@/shared/providers';
import type { SessionDTO } from '@/shared/types';

const inspect = vi.fn();

vi.mock('@/shared/hooks', async (importOriginal) => {
  const mod = await importOriginal<typeof SharedHooks>();
  return {
    ...mod,
    useInspector: () => ({ target: null, isOpen: false, inspect, close: vi.fn() }),
  };
});

const VERSION = mapPrompt({
  id: 'prm_system_3',
  type: 'system',
  text: 'You write posts.\nKeep sentences short.',
  version: 3,
  author: 'usr_admin',
  model: 'claude-opus-4-8',
  created_at: '2026-07-30T08:15:00Z',
});

function sessionFor(role: Role): SessionDTO {
  return {
    userId: `usr_${role}`,
    email: `${role}@console.local`,
    displayName: `Console ${role}`,
    role,
    mfaEnabled: false,
  };
}

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider session={sessionFor('editor')}>
        <AccessibilityProvider>
          <NotificationProvider>
            <StreamingProvider>
              <TestPromptPanel version={VERSION} typeLabel="System" />
            </StreamingProvider>
          </NotificationProvider>
        </AccessibilityProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  // The transient assistant store is module-level: clear it so each test starts
  // from the idle state (the FS9 panel-test precedent).
  useAssistantStore.setState({ slices: {}, stops: {} });
});

describe('TestPromptPanel (FS10 T-FS10.8)', () => {
  it('does NOT run on mount — the AI only runs on an explicit intent', () => {
    renderPanel();
    expect(screen.getByRole('heading', { name: 'Test this version' })).toBeInTheDocument();
    expect(screen.queryByTestId('test-prompt-output')).not.toBeInTheDocument();
  });

  it('states the §R10.9 isolation before anything runs', () => {
    renderPanel();
    expect(
      screen.getByText(/publishes nothing and writes nothing to channel memory/i),
    ).toBeInTheDocument();
  });

  it('offers only a test run — no refine, no compare, no save of the output', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: 'Run test' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /refine/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /improve/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /compare models/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save (this )?output/i })).not.toBeInTheDocument();
  });

  it('runs on intent, then shows Trust, provenance and the WIRE cost — no confidence', async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole('button', { name: 'Run test' }));

    // Anchored on the done marker (the FS6 lesson): the transient streaming
    // node is replaced when the run completes.
    expect(await screen.findByText('$0.0042', undefined, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText('Generated')).toBeInTheDocument();
    expect(screen.getByText('Source available')).toBeInTheDocument();
    // The provenance card cites the version row itself.
    expect(screen.getByText('System · v3')).toBeInTheDocument();
    expect(screen.getByText('prm_system_3')).toBeInTheDocument();
    // Confidence has no wire source and must not be rendered.
    expect(screen.queryByText(/confidence/i)).not.toBeInTheDocument();
  });

  // Streams first, then expands a disclosure: two awaits, so it needs more than
  // the 5 s default when the whole suite runs in parallel (assertions unchanged).
  it('explainability says the output is not saved and not a production preview', async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole('button', { name: 'Run test' }));
    await screen.findByText('$0.0042', undefined, { timeout: 10_000 });

    await user.click(screen.getByRole('button', { name: /Why this output/ }));
    expect(screen.getByText(/this output is not saved anywhere/i)).toBeInTheDocument();
    expect(screen.getByText(/not a preview/i)).toBeInTheDocument();
  }, 20_000);
});
